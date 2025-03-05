import "dotenv/config";
import yaml from "yaml";
import path from "path";
import fs from "fs";
import { generateAnnotatedDatabaseInfo } from "./generateAnnotatedDatabaseInfo";
import { MongoClient } from "mongodb-rag-core/mongodb";
import { OpenAI } from "mongodb-rag-core/openai";
import { assertEnvVars } from "mongodb-rag-core";
import { DATABASE_NL_QUERIES } from "../../EnvVars";
import { BRAINTRUST_ENV_VARS } from "mongodb-rag-core";
import { prettyPrintMongoDbDocument } from "./databaseMetadata/prettyPrintMongoDbDocument";

describe("generateAnnotatedDatabaseInfo", () => {
  jest.setTimeout(3000000); // Increase timeout for OpenAI API calls

  const {
    MONGODB_TEXT_TO_CODE_CONNECTION_URI,
    BRAINTRUST_API_KEY,
    BRAINTRUST_ENDPOINT,
  } = assertEnvVars({
    ...DATABASE_NL_QUERIES,
    ...BRAINTRUST_ENV_VARS,
  });
  const mongoClient = new MongoClient(MONGODB_TEXT_TO_CODE_CONNECTION_URI);
  beforeAll(async () => {
    await mongoClient.connect();
  });
  afterAll(async () => {
    await mongoClient.close();
  });
  const dbNames = [
    "sample_mflix",
    "sample_weatherdata",
    "sample_supplies",
    "sample_airbnb",
    "sample_analytics",
    "sample_geospatial",
    "sample_guides",
    "sample_restaurants",
  ];
  it.each(dbNames)(
    "should generate annotated DB info for %s",
    async (dbName) => {
      const model = "gpt-4o";
      const dbInfo = await generateAnnotatedDatabaseInfo({
        mongoDb: {
          mongoClient,
          databaseName: dbName,
          numSamplesPerCollection: 2,
        },
        llm: {
          model,
          openAiClient: new OpenAI({
            baseURL: BRAINTRUST_ENDPOINT,
            apiKey: BRAINTRUST_API_KEY,
          }),
          temperature: 0,
          max_completion_tokens: 2000,
          //   max_tokens: 2000,
        },
      });
      const pathOut = path.resolve(
        __dirname,
        dbName + "_" + model + "_" + "annotatedDbSchema.yaml"
      );
      fs.writeFileSync(
        pathOut,
        yaml.stringify(JSON.parse(prettyPrintMongoDbDocument(dbInfo.data)))
      );
      console.log("Saved to", pathOut);
    }
  );
});
