import {
  assertEnvVars,
  BRAINTRUST_ENV_VARS,
  GCP_VERTEX_AI_ENV_VARS,
} from "mongodb-rag-core";
import { makeOpenAiClientFactory } from "mongodb-rag-core/models";

const {
  BRAINTRUST_API_KEY,
  BRAINTRUST_ENDPOINT,
  GCP_API_KEY,
  GCP_OPENAI_ENDPOINT,
} = assertEnvVars({
  ...BRAINTRUST_ENV_VARS,
  ...GCP_VERTEX_AI_ENV_VARS,
});

export const openAiClientFactory = makeOpenAiClientFactory({
  braintrust: {
    apiKey: BRAINTRUST_API_KEY,
    endpoint: BRAINTRUST_ENDPOINT,
  },
  vertexAi: {
    apiKey: GCP_API_KEY,
    endpoint: GCP_OPENAI_ENDPOINT,
  },
});
