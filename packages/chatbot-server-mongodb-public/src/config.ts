/**
  @fileoverview This file contains the configuration implementation for the chat server,
  which is run from `index.ts`.
 */
import "dotenv/config";
import {
  makeMongoDbEmbeddedContentStore,
  makeMongoDbVerifiedAnswerStore,
  makeOpenAiEmbedder,
  makeMongoDbConversationsService,
  makeOpenAiChatLlm,
  AppConfig,
  CORE_ENV_VARS,
  assertEnvVars,
  makeDefaultFindContent,
  requireValidIpAddress,
  requireRequestOrigin,
  AddCustomDataFunc,
  ConversationCustomData,
  makeVerifiedAnswerGenerateUserPrompt,
  makeDefaultFindVerifiedAnswer,
} from "mongodb-chatbot-server";
import cookieParser from "cookie-parser";
import { makeStepBackRagGenerateUserPrompt } from "./processors/makeStepBackRagGenerateUserPrompt";
import { blockGetRequests } from "./middleware/blockGetRequests";
import { getRequestId, logRequest } from "./utils";
import { systemPrompt } from "./systemPrompt";
import { addReferenceSourceType } from "./processors/makeMongoDbReferences";
import path from "path";
import express from "express";
import { wrapOpenAI, wrapTraced } from "mongodb-rag-core/braintrust";
import { AzureOpenAI } from "mongodb-rag-core/openai";
import { MongoClient } from "mongodb-rag-core/mongodb";
import { TRACING_ENV_VARS } from "./EnvVars";
import {
  makeAddMessageToConversationUpdateTrace,
  makeCommentMessageUpdateTrace,
  makeRateMessageUpdateTrace,
} from "./tracing/routesUpdateTraceHandlers";
export const {
  MONGODB_CONNECTION_URI,
  MONGODB_DATABASE_NAME,
  VECTOR_SEARCH_INDEX_NAME,
  OPENAI_ENDPOINT,
  OPENAI_API_KEY,
  OPENAI_API_VERSION,
  OPENAI_RETRIEVAL_EMBEDDING_DEPLOYMENT,
  OPENAI_VERIFIED_ANSWER_EMBEDDING_DEPLOYMENT,
  OPENAI_CHAT_COMPLETION_MODEL_VERSION,
  OPENAI_CHAT_COMPLETION_DEPLOYMENT,
  OPENAI_PREPROCESSOR_CHAT_COMPLETION_DEPLOYMENT,
  JUDGE_EMBEDDING_MODEL,
  JUDGE_LLM,
} = assertEnvVars({
  ...CORE_ENV_VARS,
  OPENAI_PREPROCESSOR_CHAT_COMPLETION_DEPLOYMENT: "",
  ...TRACING_ENV_VARS,
});

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

export const openAiClient = wrapOpenAI(
  new AzureOpenAI({
    apiKey: OPENAI_API_KEY,
    endpoint: OPENAI_ENDPOINT,
    apiVersion: OPENAI_API_VERSION,
  })
);

export const llm = makeOpenAiChatLlm({
  openAiClient,
  deployment: OPENAI_CHAT_COMPLETION_DEPLOYMENT,
  openAiLmmConfigOptions: {
    temperature: 0,
    max_tokens: 1000,
  },
});

llm.answerQuestionAwaited = wrapTraced(llm.answerQuestionAwaited, {
  name: "answerQuestionAwaited",
});

export const embeddedContentStore = makeMongoDbEmbeddedContentStore({
  connectionUri: MONGODB_CONNECTION_URI,
  databaseName: MONGODB_DATABASE_NAME,
  searchIndex: {
    embeddingName: OPENAI_RETRIEVAL_EMBEDDING_DEPLOYMENT,
  },
});

export const verifiedAnswerConfig = {
  embeddingModel: OPENAI_VERIFIED_ANSWER_EMBEDDING_DEPLOYMENT,
  findNearestNeighborsOptions: {
    minScore: 0.96,
  },
};
export const retrievalConfig = {
  preprocessorLlm: OPENAI_PREPROCESSOR_CHAT_COMPLETION_DEPLOYMENT,
  embeddingModel: OPENAI_RETRIEVAL_EMBEDDING_DEPLOYMENT,
  findNearestNeighborsOptions: {
    k: 5,
    path: embeddedContentStore.metadata.embeddingPath,
    indexName: VECTOR_SEARCH_INDEX_NAME,
    minScore: 0.75,
  },
};

export const embedder = makeOpenAiEmbedder({
  openAiClient,
  deployment: retrievalConfig.embeddingModel,
  backoffOptions: {
    numOfAttempts: 3,
    maxDelay: 5000,
  },
});
embedder.embed = wrapTraced(embedder.embed, { name: "embed" });

export const findContent = wrapTraced(
  makeDefaultFindContent({
    embedder,
    store: embeddedContentStore,
    findNearestNeighborsOptions: retrievalConfig.findNearestNeighborsOptions,
  }),
  {
    name: "findContent",
  }
);

export const verifiedAnswerStore = makeMongoDbVerifiedAnswerStore({
  connectionUri: MONGODB_CONNECTION_URI,
  databaseName: MONGODB_DATABASE_NAME,
  collectionName: "verified_answers",
});

const verifiedAnswersEmbedder = makeOpenAiEmbedder({
  openAiClient,
  deployment: verifiedAnswerConfig.embeddingModel,
  backoffOptions: {
    numOfAttempts: 3,
    maxDelay: 5000,
  },
});
verifiedAnswersEmbedder.embed = wrapTraced(verifiedAnswersEmbedder.embed, {
  name: "embedVerifiedAnswers",
});

export const findVerifiedAnswer = wrapTraced(
  makeDefaultFindVerifiedAnswer({
    embedder: verifiedAnswersEmbedder,
    store: verifiedAnswerStore,
    findNearestNeighborsOptions:
      verifiedAnswerConfig.findNearestNeighborsOptions,
  }),
  { name: "findVerifiedAnswer" }
);

export const preprocessorOpenAiClient = wrapOpenAI(
  new AzureOpenAI({
    apiKey: OPENAI_API_KEY,
    endpoint: OPENAI_ENDPOINT,
    apiVersion: OPENAI_API_VERSION,
  })
);

export const generateUserPrompt = wrapTraced(
  makeVerifiedAnswerGenerateUserPrompt({
    findVerifiedAnswer,
    onVerifiedAnswerFound: (verifiedAnswer) => {
      return {
        ...verifiedAnswer,
        references: verifiedAnswer.references.map(addReferenceSourceType),
      };
    },
    onNoVerifiedAnswerFound: wrapTraced(
      makeStepBackRagGenerateUserPrompt({
        openAiClient: preprocessorOpenAiClient,
        model: retrievalConfig.preprocessorLlm,
        findContent,
        numPrecedingMessagesToInclude: 6,
      }),
      { name: "makeStepBackRagGenerateUserPrompt" }
    ),
  }),
  {
    name: "generateUserPrompt",
  }
);

export const mongodb = new MongoClient(MONGODB_CONNECTION_URI);

export const conversations = makeMongoDbConversationsService(
  mongodb.db(MONGODB_DATABASE_NAME)
);

export const createCustomConversationDataWithIpAuthUserAndOrigin: AddCustomDataFunc =
  async (req, res) => {
    const customData: ConversationCustomData = {};
    if (req.cookies.auth_user) {
      customData.authUser = req.cookies.auth_user;
    }
    if (req.ip) {
      customData.ip = req.ip;
    }
    if (res.locals.customData.origin) {
      customData.origin = res.locals.customData.origin;
    }
    logRequest({
      reqId: getRequestId(req),
      message: `Custom data: ${customData}`,
    });
    return customData;
  };
export const isProduction = process.env.NODE_ENV === "production";

const llmAsAJudgeConfig = {
  judgeModel: JUDGE_LLM,
  judgeEmbeddingModel: JUDGE_EMBEDDING_MODEL,
  openAiConfig: {
    azureOpenAi: {
      apiKey: OPENAI_API_KEY,
      endpoint: OPENAI_ENDPOINT,
      apiVersion: OPENAI_API_VERSION,
    },
  },
};

const {
  BRAINTRUST_CHATBOT_TRACING_PROJECT_NAME,
  SLACK_BOT_TOKEN,
  SLACK_COMMENT_CONVERSATION_ID,
} = process.env;

export const config: AppConfig = {
  conversationsRouterConfig: {
    llm,
    middleware: [
      blockGetRequests,
      requireValidIpAddress(),
      requireRequestOrigin(),
      cookieParser(),
    ],
    createConversationCustomData: !isProduction
      ? createCustomConversationDataWithIpAuthUserAndOrigin
      : undefined,
    addMessageToConversationUpdateTrace:
      makeAddMessageToConversationUpdateTrace(
        retrievalConfig.findNearestNeighborsOptions.k,
        { ...llmAsAJudgeConfig, percentToJudge: isProduction ? 0.1 : 1 }
      ),
    rateMessageUpdateTrace: makeRateMessageUpdateTrace(llmAsAJudgeConfig),
    commentMessageUpdateTrace: makeCommentMessageUpdateTrace(
      openAiClient,
      JUDGE_LLM,
      SLACK_BOT_TOKEN !== undefined &&
        SLACK_COMMENT_CONVERSATION_ID !== undefined
        ? {
            token: SLACK_BOT_TOKEN,
            conversationId: SLACK_COMMENT_CONVERSATION_ID,
            llmAsAJudge: llmAsAJudgeConfig,
            braintrust: BRAINTRUST_CHATBOT_TRACING_PROJECT_NAME
              ? {
                  orgName: "mongodb-education-ai",
                  projectName: BRAINTRUST_CHATBOT_TRACING_PROJECT_NAME,
                }
              : undefined,
          }
        : undefined
    ),
    generateUserPrompt,
    systemPrompt,
    maxUserMessagesInConversation: 50,
    maxUserCommentLength: 500,
    conversations,
    maxInputLengthCharacters: 3000,
  },
  maxRequestTimeoutMs: 60000,
  corsOptions: {
    origin: allowedOrigins,
    // Allow cookies from different origins to be sent to the server.
    credentials: true,
  },
  expressAppConfig: !isProduction
    ? async (app) => {
        const staticAssetsPath = path.join(__dirname, "..", "static");
        app.use(express.static(staticAssetsPath));
      }
    : undefined,
};
