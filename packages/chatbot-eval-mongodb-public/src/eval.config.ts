import {
  EvalConfig,
  makeMongoDbCommandMetadataStore,
  makeMongoDbGeneratedDataStore,
  makeGenerateConversationData,
  getConversationsTestCasesFromYaml,
  makeEvaluateConversationQuality,
  makeMongoDbEvaluationStore,
  makeMongoDbReportStore,
  mongodbResponseQualityExamples,
  reportStatsForBinaryEvalRun,
  makeEvaluateConversationFaithfulness,
  makeGenerateLlmConversationData,
} from "mongodb-chatbot-evaluation";
import {
  makeLangchainChatLlm,
  makeMongoDbConversationsService,
  makeOpenAiChatLlm,
} from "mongodb-chatbot-server";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { MongoClient, assertEnvVars } from "mongodb-rag-core";
import { envVars } from "./envVars";
import { ChatOpenAI } from "@langchain/openai";

export default async () => {
  const {
    MONGODB_DATABASE_NAME,
    MONGODB_CONNECTION_URI,
    CONVERSATIONS_SERVER_BASE_URL,
    OPENAI_CHAT_COMPLETION_DEPLOYMENT,
    OPENAI_ENDPOINT,
    OPENAI_API_KEY,
    OPENAI_GPT_4_CHAT_COMPLETION_DEPLOYMENT,
  } = assertEnvVars(envVars);

  const { OpenAIClient, AzureKeyCredential } = await import("@azure/openai");
  const { OpenAI: LlamaIndexOpenAiLlm } = await import("llamaindex");
  const miscTestCases = getConversationsTestCasesFromYaml(
    fs.readFileSync(
      path.resolve(__dirname, "..", "testCases", "conversations.yml"),
      "utf8"
    )
  );
  const faqTestCases = getConversationsTestCasesFromYaml(
    fs.readFileSync(
      path.resolve(__dirname, "..", "testCases", "faq_conversations.yml"),
      "utf8"
    )
  );
  const allTestCases = [...miscTestCases, ...faqTestCases];

  const storeDbOptions = {
    connectionUri: MONGODB_CONNECTION_URI,
    databaseName: MONGODB_DATABASE_NAME,
  };

  const mongodb = new MongoClient(MONGODB_CONNECTION_URI);
  await mongodb.connect();

  const db = mongodb.db(MONGODB_DATABASE_NAME);
  const conversations = makeMongoDbConversationsService(db);

  const evalConfig = {
    metadataStore: makeMongoDbCommandMetadataStore(storeDbOptions),
    generatedDataStore: makeMongoDbGeneratedDataStore(storeDbOptions),
    evaluationStore: makeMongoDbEvaluationStore(storeDbOptions),
    reportStore: makeMongoDbReportStore(storeDbOptions),

    commands: {
      generate: {
        conversations: {
          type: "conversation",
          testCases: allTestCases,
          generator: makeGenerateConversationData({
            conversations,
            httpHeaders: {
              Origin: "Testing",
            },
            apiBaseUrl: CONVERSATIONS_SERVER_BASE_URL,
          }),
        },
        faqConversations: {
          type: "conversation",
          testCases: faqTestCases,
          generator: makeGenerateConversationData({
            conversations,
            httpHeaders: {
              Origin: "Testing",
            },
            apiBaseUrl: CONVERSATIONS_SERVER_BASE_URL,
          }),
        },
        gpt35_0613_Conversations: {
          type: "conversation",
          testCases: allTestCases,
          generator: makeGenerateLlmConversationData({
            chatLlm: makeOpenAiChatLlm({
              deployment: OPENAI_CHAT_COMPLETION_DEPLOYMENT, // GPT-3.5
              openAiClient: new OpenAIClient(
                OPENAI_ENDPOINT,
                new AzureKeyCredential(OPENAI_API_KEY)
              ),
              openAiLmmConfigOptions: {
                temperature: 0,
                maxTokens: 1000,
              },
            }),
          }),
        },
        gpt4_0124_Conversations: {
          type: "conversation",
          testCases: allTestCases,
          generator: makeGenerateLlmConversationData({
            chatLlm: makeOpenAiChatLlm({
              deployment: OPENAI_GPT_4_CHAT_COMPLETION_DEPLOYMENT,
              openAiClient: new OpenAIClient(
                OPENAI_ENDPOINT,
                new AzureKeyCredential(OPENAI_API_KEY)
              ),
              openAiLmmConfigOptions: {
                temperature: 0,
                maxTokens: 1000,
              },
            }),
          }),
        },
      },
      evaluate: {
        conversationQuality: {
          evaluator: makeEvaluateConversationQuality({
            deploymentName: OPENAI_CHAT_COMPLETION_DEPLOYMENT,
            openAiClient: new OpenAIClient(
              OPENAI_ENDPOINT,
              new AzureKeyCredential(OPENAI_API_KEY)
            ),
            fewShotExamples: mongodbResponseQualityExamples,
          }),
        },
        conversationFaithfulness: {
          evaluator: makeEvaluateConversationFaithfulness({
            llamaIndexLlm: new LlamaIndexOpenAiLlm({
              azure: {
                apiKey: OPENAI_API_KEY,
                endpoint: OPENAI_ENDPOINT,
                deploymentName: OPENAI_GPT_4_CHAT_COMPLETION_DEPLOYMENT,
              },
            }),
          }),
        },
      },
      report: {
        conversationQualityRun: {
          reporter: reportStatsForBinaryEvalRun,
        },
        conversationFaithfulnessRun: {
          reporter: reportStatsForBinaryEvalRun,
        },
        gpt35_0613_ConversationQualityRun: {
          reporter: reportStatsForBinaryEvalRun,
        },
        gpt4_0124_ConversationQualityRun: {
          reporter: reportStatsForBinaryEvalRun,
        },
      },
    },
    async afterAll() {
      await mongodb.close();
    },
  } satisfies EvalConfig;
  return evalConfig;
};
