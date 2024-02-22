import {
  EvalConfig,
  makeMongoDbCommandMetadataStore,
} from "mongodb-chatbot-eval";
import {
  makeMongoDbGeneratedDataStore,
  makeGenerateConversationData,
  getConversationsTestCasesFromYaml,
} from "mongodb-chatbot-eval/generate";
import { makeMongoDbEvaluationStore } from "mongodb-chatbot-eval/evaluate";
import { makeMongoDbReportStore } from "mongodb-chatbot-eval/report";
import { makeMongoDbConversationsService } from "mongodb-chatbot-server";
import "dotenv/config";
import { strict as assert } from "assert";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb-rag-core";

export default async () => {
  const { MONGODB_DATABASE_NAME, MONGODB_CONNECTION_URI } = process.env;
  assert(MONGODB_DATABASE_NAME, "MONGODB_DATABASE_NAME is required");
  assert(MONGODB_CONNECTION_URI, "MONGODB_CONNECTION_URI is required");
  // dynamic import to allow loading from .env file before import
  const testCases = getConversationsTestCasesFromYaml(
    fs.readFileSync(
      path.resolve(__dirname, "..", "testCases", "conversations.yml"),
      "utf8"
    )
  );
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
          testCases,
          generator: makeGenerateConversationData({
            conversations,
            httpHeaders: {
              Origin: "Testing",
            },
          }),
        },
      },
    },
    async afterAll() {
      await mongodb.close();
    },
  } satisfies EvalConfig;
  return evalConfig;
};
