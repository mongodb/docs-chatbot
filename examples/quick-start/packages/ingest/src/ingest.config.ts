import { makeIngestMetaStore, Config } from "mongodb-rag-ingest";
import {
  makeOpenAiEmbedder,
  makeMongoDbEmbeddedContentStore,
  makeMongoDbPageStore,
} from "mongodb-rag-core";
import { standardChunkFrontMatterUpdater } from "mongodb-rag-core";
import path from "path";
import { loadEnvVars } from "./loadEnvVars";
import { mongoDbChatbotFrameworkDocsDataSourceConstructor } from "./mongodbChatbotFrameworkDataSource";
import { OpenAI } from "mongodb-rag-core/openai";

// Load project environment variables
const dotenvPath = path.join(__dirname, "..", "..", "..", ".env"); // .env at project root
const {
  MONGODB_CONNECTION_URI,
  MONGODB_DATABASE_NAME,
  OPENAI_API_KEY,
  OPENAI_EMBEDDING_MODEL,
} = loadEnvVars(dotenvPath);

export default {
  embedder: async () => {
    return makeOpenAiEmbedder({
      openAiClient: new OpenAI({ apiKey: OPENAI_API_KEY }),
      deployment: OPENAI_EMBEDDING_MODEL,
      backoffOptions: {
        numOfAttempts: 25,
        startingDelay: 1000,
      },
    });
  },
  embeddedContentStore: () =>
    makeMongoDbEmbeddedContentStore({
      connectionUri: MONGODB_CONNECTION_URI,
      databaseName: MONGODB_DATABASE_NAME,
    }),
  pageStore: () =>
    makeMongoDbPageStore({
      connectionUri: MONGODB_CONNECTION_URI,
      databaseName: MONGODB_DATABASE_NAME,
    }),
  ingestMetaStore: () =>
    makeIngestMetaStore({
      connectionUri: MONGODB_CONNECTION_URI,
      databaseName: MONGODB_DATABASE_NAME,
      entryId: "all",
    }),
  chunkOptions: () => ({
    transform: standardChunkFrontMatterUpdater,
  }),
  // Add data sources here
  dataSources: async () => {
    const mongodbChatbotFrameworkSource =
      await mongoDbChatbotFrameworkDocsDataSourceConstructor();

    return [mongodbChatbotFrameworkSource];
  },
  concurrencyOptions: () => ({
    embed: {
      createChunks: 5,
      processPages: 2,
    },
  }),
} satisfies Config;
