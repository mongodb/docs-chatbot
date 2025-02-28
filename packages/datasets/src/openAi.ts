import { assertEnvVars } from "mongodb-rag-core";
import { OPENAI_ENV_VARS } from "./EnvVars";
import { AzureOpenAI } from "mongodb-rag-core/openai";

const {
  OPENAI_API_KEY,
  OPENAI_API_VERSION,
  OPENAI_CHAT_COMPLETION_DEPLOYMENT,
  OPENAI_ENDPOINT,
} = assertEnvVars(OPENAI_ENV_VARS);

export const openAiClient = new AzureOpenAI({
  apiKey: OPENAI_API_KEY,
  apiVersion: OPENAI_API_VERSION,
  endpoint: OPENAI_ENDPOINT,
});

export const model = OPENAI_CHAT_COMPLETION_DEPLOYMENT;
