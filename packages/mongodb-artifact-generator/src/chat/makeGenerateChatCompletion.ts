import "dotenv/config";
import {
  assertEnvVars,
  CORE_OPENAI_CHAT_COMPLETION_ENV_VARS,
  OpenAI,
} from "mongodb-rag-core";

export type GenerateChatCompletion = (
  messages: OpenAI.default.ChatCompletionMessageParam[]
) => Promise<string | undefined>;

export function makeGenerateChatCompletion(): GenerateChatCompletion {
  const {
    OPENAI_API_KEY,
    OPENAI_CHAT_COMPLETION_DEPLOYMENT,
    OPENAI_ENDPOINT,
    OPENAI_API_VERSION,
  } = assertEnvVars(CORE_OPENAI_CHAT_COMPLETION_ENV_VARS);
  const openAiClient = new OpenAI.AzureOpenAI({
    apiKey: OPENAI_API_KEY,
    endpoint: OPENAI_ENDPOINT,
    apiVersion: OPENAI_API_VERSION,
  });
  return async (messages) => {
    try {
      const {
        choices: [{ message }],
      } = await openAiClient.chat.completions.create({
        model: OPENAI_CHAT_COMPLETION_DEPLOYMENT,
        messages,
      });
      return message?.content ?? undefined;
    } catch (err) {
      console.error(`Error generating chat completion`, err);
      throw err;
    }
  };
}
