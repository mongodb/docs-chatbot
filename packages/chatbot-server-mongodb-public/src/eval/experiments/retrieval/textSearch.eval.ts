import "dotenv/config";
import {
  CORE_ENV_VARS,
  makeMongoDbEmbeddedContentStore,
  makeTextSearchFindContent,
  assertEnvVars,
  FindContentFunc,
  Message,
  updateFrontMatter,
  MakeTextSearchFindContentParams,
} from "mongodb-rag-core";
import { retrievalConfig, preprocessorOpenAiClient } from "../../../config";
import { extractMongoDbMetadataFromUserMessage } from "../../../processors/extractMongoDbMetadataFromUserMessage";
import {
  getConversationRetrievalEvalData,
  RetrievalEvalTask,
  runRetrievalEval,
} from "../../evaluationSuites/retrieval";
import { makeStepBackUserQuery } from "../../../processors/makeStepBackUserQuery";
import { OpenAI } from "mongodb-rag-core/openai";
import { getPath } from "./evalCasePath";

const {
  MONGODB_CONNECTION_URI,
  MONGODB_DATABASE_NAME,
  OPENAI_RETRIEVAL_EMBEDDING_DEPLOYMENT,
  FTS_INDEX_NAME,
} = assertEnvVars(CORE_ENV_VARS);

const embeddedContentStore = makeMongoDbEmbeddedContentStore({
  connectionUri: MONGODB_CONNECTION_URI,
  databaseName: MONGODB_DATABASE_NAME,
  searchIndex: {
    embeddingName: OPENAI_RETRIEVAL_EMBEDDING_DEPLOYMENT,
    fullText: {
      name: FTS_INDEX_NAME,
    },
  },
});

// Uses same K in evals as in retrieval config.
// This is because we always return all results to the user in the chatbot.
// If we were to use the retrieval system in a different context where
// we only return the top results of a larger query,
// we could readdress this.
const { k } = retrievalConfig.findNearestNeighborsOptions;

const ftsFindContentConfig = {
  store: embeddedContentStore,
  config: {
    fts: {
      indexName: FTS_INDEX_NAME,
      weight: 0.15,
      limit: retrievalConfig.findNearestNeighborsOptions.k * 20,
      // additionalQueryElements: {},
    },
    limit: retrievalConfig.findNearestNeighborsOptions.k,
  },
} satisfies MakeTextSearchFindContentParams;
const ftsFindContent = makeTextSearchFindContent(ftsFindContentConfig);

const retrieveRelevantContentEvalTask: RetrievalEvalTask = async function (
  data
) {
  const results = await retrieveRelevantContent({
    userMessageText: data.query,
    model: retrievalConfig.preprocessorLlm,
    openAiClient: preprocessorOpenAiClient,
    findContent: ftsFindContent,
  });

  return {
    extractedMetadata: results.metadataForQuery,
    rewrittenQuery: results.transformedUserQuery,
    searchString: results.searchQuery,
    results: results.content.map((c) => ({
      url: c.url,
      content: c.text,
      score: c.score,
    })),
  };
};

async function retrieveRelevantContent({
  openAiClient,
  model,
  precedingMessagesToInclude,
  userMessageText,
}: {
  openAiClient: OpenAI;
  model: string;
  precedingMessagesToInclude?: Message[];
  userMessageText: string;
  findContent: typeof ftsFindContent;
}) {
  const metadataForQuery = await extractMongoDbMetadataFromUserMessage({
    openAiClient: preprocessorOpenAiClient,
    model: retrievalConfig.preprocessorLlm,
    userMessageText,
  });
  const { transformedUserQuery } = await makeStepBackUserQuery({
    openAiClient,
    model,
    messages: precedingMessagesToInclude,
    userMessageText: metadataForQuery
      ? updateFrontMatter(userMessageText, metadataForQuery)
      : userMessageText,
  });

  const vectorSearchQuery = metadataForQuery
    ? updateFrontMatter(transformedUserQuery, metadataForQuery)
    : transformedUserQuery;

  const { content } = await ftsFindContent({
    query: vectorSearchQuery,
    originalQuery: userMessageText,
    metadata: metadataForQuery,
  });

  return {
    content,
    transformedUserQuery,
    searchQuery: vectorSearchQuery,
    metadataForQuery,
  };
}

runRetrievalEval({
  experimentName: `mongodb-chatbot-retrieval-FTS`,
  metadata: {
    description: "Evaluates quality of chatbot retrieval system.",
    retrievalConfig: ftsFindContent,
  },
  data: () => getConversationRetrievalEvalData(getPath()),
  task: retrieveRelevantContentEvalTask,
  maxConcurrency: 20,
  k,
});
