import {
  References,
  SomeMessage,
  DataStreamer,
  Conversation,
  escapeNewlines,
  OpenAiChatMessage,
  AssistantMessage,
  UserMessage,
  ConversationCustomData,
  ChatLlm,
} from "mongodb-rag-core";
import { Request as ExpressRequest } from "express";
import { logRequest } from "../utils";
import { strict as assert } from "assert";
import { GenerateUserPromptFunc } from "../processors/GenerateUserPromptFunc";
import { FilterPreviousMessages } from "../processors/FilterPreviousMessages";

export type ClientContext = Record<string, unknown>;

export interface GenerateResponseParams {
  shouldStream: boolean;
  llm: ChatLlm;
  latestMessageText: string;
  clientContext?: ClientContext;
  customData?: ConversationCustomData;
  dataStreamer?: DataStreamer;
  generateUserPrompt?: GenerateUserPromptFunc;
  filterPreviousMessages?: FilterPreviousMessages;
  reqId: string;
  llmNotWorkingMessage: string;
  noRelevantContentMessage: string;
  conversation: Conversation;
  request?: ExpressRequest;
}

interface GenerateResponseReturnValue {
  messages: SomeMessage[];
}

export type GenerateResponse = (
  params: GenerateResponseParams
) => Promise<GenerateResponseReturnValue>;

/**
  Generate a response with/without streaming. Supports tool calling
  and standard response generation.
  Response includes the user message with any data mutations
  and the assistant response message, plus any intermediate tool calls.
 */
export async function generateResponse({
  shouldStream,
  llm,
  latestMessageText,
  clientContext,
  customData,
  generateUserPrompt,
  filterPreviousMessages,
  dataStreamer,
  reqId,
  llmNotWorkingMessage,
  noRelevantContentMessage,
  conversation,
  request,
}: GenerateResponseParams): Promise<GenerateResponseReturnValue> {
  const { userMessage, references, staticResponse, rejectQuery } =
    await (generateUserPrompt
      ? generateUserPrompt({
          userMessageText: latestMessageText,
          clientContext,
          conversation,
          reqId,
          customData,
        })
      : {
          userMessage: {
            role: "user",
            content: latestMessageText,
            customData,
          } satisfies UserMessage,
        });
  // Add request custom data to user message.
  const userMessageWithCustomData = customData
    ? {
        ...userMessage,
        // Override request custom data fields with user message custom data fields.
        customData: { ...customData, ...(userMessage.customData ?? {}) },
      }
    : userMessage;
  const newMessages: SomeMessage[] = [userMessageWithCustomData];

  // Metadata for streaming
  let streamingResponseMetadata: Record<string, unknown> | undefined;
  // Send static response if query rejected or static response provided
  if (rejectQuery) {
    const rejectionMessage = {
      role: "assistant",
      content: noRelevantContentMessage,
      references: references ?? [],
    } satisfies AssistantMessage;
    newMessages.push(rejectionMessage);
  } else if (staticResponse) {
    newMessages.push(staticResponse);
    // Need to specify response metadata for streaming
    streamingResponseMetadata = staticResponse.metadata;
  }

  // Prepare conversation messages for LLM
  const previousConversationMessagesForLlm = (
    filterPreviousMessages
      ? await filterPreviousMessages(conversation)
      : conversation.messages
  ).map(convertConversationMessageToLlmMessage);
  const newMessagesForLlm = newMessages.map((m) => {
    // Use transformed content if it exists for user message
    // (e.g. from a custom user prompt, query preprocessor, etc),
    // otherwise use original content.
    if (m.role === "user") {
      return {
        content: m.contentForLlm ?? m.content,
        role: "user",
      } satisfies OpenAiChatMessage;
    }
    return convertConversationMessageToLlmMessage(m);
  });
  const llmConversation = [
    ...previousConversationMessagesForLlm,
    ...newMessagesForLlm,
  ];

  const shouldGenerateMessage = !rejectQuery && !staticResponse;

  if (shouldStream) {
    assert(dataStreamer, "Data streamer required for streaming");
    const { messages } = await streamGenerateResponseMessage({
      dataStreamer,
      reqId,
      llm,
      llmConversation,
      noRelevantContentMessage,
      llmNotWorkingMessage,
      request,
      shouldGenerateMessage,
      conversation,
      references,
      metadata: streamingResponseMetadata,
    });
    newMessages.push(...messages);
  } else {
    const { messages } = await awaitGenerateResponseMessage({
      reqId,
      llm,
      llmConversation,
      llmNotWorkingMessage,
      noRelevantContentMessage,
      request,
      shouldGenerateMessage,
      conversation,
      references,
    });
    newMessages.push(...messages);
  }
  return { messages: newMessages };
}

type BaseGenerateResponseMessageParams = Omit<
  GenerateResponseParams,
  "latestMessageText" | "customData" | "filterPreviousMessages" | "shouldStream"
> & {
  references?: References;
  shouldGenerateMessage?: boolean;
  llmConversation: OpenAiChatMessage[];
};

export type AwaitGenerateResponseParams = Omit<
  BaseGenerateResponseMessageParams,
  "dataStreamer"
>;

export async function awaitGenerateResponseMessage({
  reqId,
  llmConversation,
  llm,
  llmNotWorkingMessage,
  noRelevantContentMessage,
  request,
  references,
  conversation,
  shouldGenerateMessage = true,
}: AwaitGenerateResponseParams): Promise<GenerateResponseReturnValue> {
  const newMessages: SomeMessage[] = [];
  const outputReferences: References = [];

  if (references) {
    outputReferences.push(...references);
  }

  if (shouldGenerateMessage) {
    try {
      logRequest({
        reqId,
        message: `All messages for LLM: ${JSON.stringify(llmConversation)}`,
      });
      const answer = await llm.answerQuestionAwaited({
        messages: llmConversation,
      });
      newMessages.push(convertMessageFromLlmToDb(answer));

      // LLM responds with tool call
      if (answer?.function_call) {
        assert(
          llm.callTool,
          "You must implement the callTool() method on your ChatLlm to access this code."
        );
        const toolAnswer = await llm.callTool({
          messages: [...llmConversation, ...newMessages],
          conversation,
          request,
        });
        logRequest({
          reqId,
          message: `LLM tool call: ${JSON.stringify(toolAnswer)}`,
        });
        const {
          toolCallMessage,
          references: toolReferences,
          rejectUserQuery,
        } = toolAnswer;
        newMessages.push(convertMessageFromLlmToDb(toolCallMessage));
        // Update references from tool call
        if (toolReferences) {
          outputReferences.push(...toolReferences);
        }
        // Return static response if query rejected by tool call
        if (rejectUserQuery) {
          newMessages.push({
            role: "assistant",
            content: noRelevantContentMessage,
          });
        } else {
          // Otherwise respond with LLM again
          const answer = await llm.answerQuestionAwaited({
            messages: [...llmConversation, ...newMessages],
            // Only allow 1 tool call per user message.
          });
          newMessages.push(convertMessageFromLlmToDb(answer));
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : JSON.stringify(err);
      logRequest({
        reqId,
        message: `LLM error: ${errorMessage}`,
        type: "error",
      });
      logRequest({
        reqId,
        message: "Only sending vector search results to user",
      });
      const llmNotWorkingResponse = {
        role: "assistant",
        content: llmNotWorkingMessage,
        references,
      } satisfies AssistantMessage;
      newMessages.push(llmNotWorkingResponse);
    }
  }
  // Add references to the last assistant message (excluding function calls)
  if (
    newMessages.at(-1)?.role === "assistant" &&
    !(newMessages.at(-1) as AssistantMessage).functionCall &&
    outputReferences.length > 0
  ) {
    (newMessages.at(-1) as AssistantMessage).references = outputReferences;
  }
  return { messages: newMessages };
}

export type StreamGenerateResponseParams = BaseGenerateResponseMessageParams &
  Required<Pick<GenerateResponseParams, "dataStreamer">> & {
    /**
      Arbitrary data about the message to stream before the generated response.
    */
    metadata?: Record<string, unknown>;
  };

export async function streamGenerateResponseMessage({
  dataStreamer,
  llm,
  llmConversation,
  reqId,
  references,
  noRelevantContentMessage,
  llmNotWorkingMessage,
  conversation,
  request,
  metadata,
  shouldGenerateMessage,
}: StreamGenerateResponseParams): Promise<GenerateResponseReturnValue> {
  const newMessages: SomeMessage[] = [];
  const outputReferences: References = [];

  if (references) {
    outputReferences.push(...references);
  }

  if (metadata) {
    dataStreamer.streamData({ type: "metadata", data: metadata });
  }
  if (shouldGenerateMessage) {
    try {
      const answerStream = await llm.answerQuestionStream({
        messages: llmConversation,
      });
      const initialAssistantMessage: AssistantMessage = {
        role: "assistant",
        content: "",
      };
      const functionCallContent = {
        name: "",
        arguments: "",
      };

      for await (const event of answerStream) {
        if (event.choices.length === 0) {
          continue;
        }
        // The event could contain many choices, but we only want the first one
        const choice = event.choices[0];

        // Assistant response to user
        if (choice.delta?.content) {
          const content = escapeNewlines(choice.delta.content ?? "");
          dataStreamer.streamData({
            type: "delta",
            data: content,
          });
          initialAssistantMessage.content += content;
        }
        // Tool call
        else if (choice.delta?.function_call) {
          if (choice.delta?.function_call.name) {
            functionCallContent.name += escapeNewlines(
              choice.delta?.function_call.name ?? ""
            );
          }
          if (choice.delta?.function_call.arguments) {
            functionCallContent.arguments += escapeNewlines(
              choice.delta?.function_call.arguments ?? ""
            );
          }
        } else if (choice.delta) {
          logRequest({
            reqId,
            message: `Unexpected message in stream: no delta. Message: ${JSON.stringify(
              choice.delta.content
            )}`,
            type: "warn",
          });
        }
      }
      const shouldCallTool = functionCallContent.name !== "";
      if (shouldCallTool) {
        initialAssistantMessage.functionCall = functionCallContent;
      }
      newMessages.push(initialAssistantMessage);

      logRequest({
        reqId,
        message: `LLM response: ${JSON.stringify(initialAssistantMessage)}`,
      });
      // Tool call
      if (shouldCallTool) {
        assert(
          llm.callTool,
          "You must implement the callTool() method on your ChatLlm to access this code."
        );
        const {
          toolCallMessage,
          references: toolReferences,
          rejectUserQuery,
        } = await llm.callTool({
          messages: [...llmConversation, ...newMessages],
          conversation,
          dataStreamer,
          request,
        });
        newMessages.push(convertMessageFromLlmToDb(toolCallMessage));

        if (rejectUserQuery) {
          newMessages.push({
            role: "assistant",
            content: noRelevantContentMessage,
          });
          dataStreamer.streamData({
            type: "delta",
            data: noRelevantContentMessage,
          });
        } else {
          if (toolReferences) {
            outputReferences.push(...toolReferences);
          }
          const answerStream = await llm.answerQuestionStream({
            messages: [...llmConversation, ...newMessages],
          });
          const answerContent = await dataStreamer.stream({
            stream: answerStream,
          });
          const answerMessage = {
            role: "assistant",
            content: answerContent,
          } satisfies AssistantMessage;
          newMessages.push(answerMessage);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : JSON.stringify(err);
      logRequest({
        reqId,
        message: `LLM error: ${errorMessage}`,
        type: "error",
      });
      logRequest({
        reqId,
        message: "Only sending vector search results to user",
      });
      const llmNotWorkingResponse = {
        role: "assistant",
        content: llmNotWorkingMessage,
      } satisfies AssistantMessage;
      dataStreamer.streamData({
        type: "delta",
        data: llmNotWorkingMessage,
      });
      newMessages.push(llmNotWorkingResponse);
    }
  }
  // Handle streaming static message response
  else {
    const staticMessage = llmConversation.at(-1);
    assert(staticMessage?.content, "No static message content");
    assert(staticMessage.role === "assistant", "Static message not assistant");
    logRequest({
      reqId,
      message: `Sending static message to user: ${staticMessage.content}`,
      type: "warn",
    });
    dataStreamer.streamData({
      type: "delta",
      data: staticMessage.content,
    });
  }

  // Add references to the last assistant message
  if (newMessages.at(-1)?.role === "assistant" && outputReferences.length > 0) {
    (newMessages.at(-1) as AssistantMessage).references = outputReferences;
  }
  if (outputReferences.length > 0) {
    // Stream back references
    dataStreamer.streamData({
      type: "references",
      data: outputReferences,
    });
  }

  return { messages: newMessages.map(convertMessageFromLlmToDb) };
}

export function convertMessageFromLlmToDb(
  message: OpenAiChatMessage
): SomeMessage {
  const dbMessage = {
    ...message,
    content: message?.content ?? "",
  };
  if (message.role === "assistant" && message.function_call) {
    (dbMessage as AssistantMessage).functionCall = message.function_call;
  }

  return dbMessage;
}

function convertConversationMessageToLlmMessage(
  message: SomeMessage
): OpenAiChatMessage {
  const { content, role } = message;
  if (role === "system") {
    return {
      content: content,
      role: "system",
    } satisfies OpenAiChatMessage;
  }
  if (role === "function") {
    return {
      content: content,
      role: "function",
      name: message.name,
    } satisfies OpenAiChatMessage;
  }
  if (role === "user") {
    return {
      content: content,
      role: "user",
    } satisfies OpenAiChatMessage;
  }
  if (role === "assistant") {
    return {
      content: content,
      role: "assistant",
      ...(message.functionCall ? { function_call: message.functionCall } : {}),
    } satisfies OpenAiChatMessage;
  }
  throw new Error(`Invalid message role: ${role}`);
}
