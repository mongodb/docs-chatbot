import { OpenAI } from "mongodb-rag-core/openai";

export type LlmOptions = {
  openAiClient: OpenAI;
} & Omit<
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  "messages" | "tools" | "tool_choice"
>;
