import "dotenv/config";
import { makeMongoDbEmbeddedContentStore } from "../contentStore";
import { makeOpenAiEmbedder } from "../embed";
import { assertEnvVars } from "../assertEnvVars";
import {
  CORE_CHATBOT_APP_ENV_VARS,
  CORE_OPENAI_RETRIEVAL_ENV_VARS,
} from "../CoreEnvVars";
import { AzureOpenAI } from "openai";
import { MakeRrfFindContentParams, makeRrfFindContent } from "./RrfFindContent";

jest.setTimeout(30000);
describe("makeRrfFindContent()", () => {
  const {
    MONGODB_CONNECTION_URI,
    MONGODB_DATABASE_NAME,
    OPENAI_ENDPOINT,
    OPENAI_API_KEY,
    OPENAI_RETRIEVAL_EMBEDDING_DEPLOYMENT,
    OPENAI_API_VERSION,
    VECTOR_SEARCH_INDEX_NAME,
    FTS_INDEX_NAME,
  } = assertEnvVars({
    ...CORE_CHATBOT_APP_ENV_VARS,
    ...CORE_OPENAI_RETRIEVAL_ENV_VARS,
  });
  const embeddedContentStore = makeMongoDbEmbeddedContentStore({
    connectionUri: MONGODB_CONNECTION_URI,
    databaseName: MONGODB_DATABASE_NAME,
    searchIndex: {
      embeddingName: OPENAI_RETRIEVAL_EMBEDDING_DEPLOYMENT,
      name: VECTOR_SEARCH_INDEX_NAME,
      fullText: {
        name: FTS_INDEX_NAME,
      },
    },
  });

  const openAiClient = new AzureOpenAI({
    apiKey: OPENAI_API_KEY,
    endpoint: OPENAI_ENDPOINT,
    apiVersion: OPENAI_API_VERSION,
  });

  const embedder = makeOpenAiEmbedder({
    openAiClient,
    deployment: OPENAI_RETRIEVAL_EMBEDDING_DEPLOYMENT,
    backoffOptions: {
      numOfAttempts: 1,
      maxDelay: 500,
    },
  });

  const baseConfig = {
    embedder,
    store: embeddedContentStore,
    config: {
      limit: 10,
      fts: {
        indexName: FTS_INDEX_NAME,
        weight: 0.5,
        limit: 25,
      },
      vectorSearch: {
        weight: 0.5,
        options: {
          indexName: VECTOR_SEARCH_INDEX_NAME,
          k: 25,
          minScore: 0.7,
        },
      },
    },
  } satisfies MakeRrfFindContentParams;

  test("Should return content for relevant text", async () => {
    const findContent = makeRrfFindContent(baseConfig);
    const query = "MongoDB Atlas";
    const { content } = await findContent({
      query,
    });
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
  });
  test("Should not return content for irrelevant text", async () => {
    const findContent = makeRrfFindContent({
      ...baseConfig,
      config: {
        ...baseConfig.config,
        vectorSearch: {
          ...baseConfig.config.vectorSearch,
          options: {
            ...baseConfig.config.vectorSearch.options,
            minScore: 0.99,
          },
        },
      },
    });
    const query =
      "asdlfkjasdlfkjasdlfkjasdlfkjasdlfkjasdlfkjasdlfkjafdshgjfkhfdugytfasfghjkujufgjdfhstgragtyjuikolaf;ldkgsdjfnh;ks'l;addfsghjklafjklsgfjgreaj;agre;jlg;ljewrqjknerqnkjkgn;jwr;lwreg";
    const { content } = await findContent({
      query,
    });
    expect(content).toHaveLength(0);
  });
});
