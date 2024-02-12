/**
  @fileoverview This file contains the interfaces for the LLM service.
  Note that the LLM service is based on the OpenAI API, so the interface borrow
  from that. This interface could still work with non OpenAI providers if they
  implement the same interface.
 */
import {
  ChatCompletions,
  ChatRequestAssistantMessage,
  ChatRequestMessage,
  FunctionCallPreset,
  FunctionDefinition,
  FunctionName,
} from "@azure/openai";
import { Reference } from "mongodb-rag-core";
import { Request as ExpressRequest } from "express";
import { Conversation } from "./ConversationsService";
import { DataStreamer } from "./dataStreamer";
export type OpenAiMessageRole = "system" | "assistant" | "user" | "function";

export type OpenAiChatMessage = ChatRequestMessage & {
  /**
    The role of the message in the context of the conversation.
   */
  role: OpenAiMessageRole;

  /**
    The vector representation of the content.
   */
  embedding?: number[];
  content: string | null;
};

export type SystemPrompt = OpenAiChatMessage & {
  role: "system";
  content: string;
};

export interface LlmAnswerQuestionParams {
  messages: OpenAiChatMessage[];
  toolCallOptions?: ToolCallDirective;
}
/**
  Tool for the chatbot to use.
 */
export interface Tool {
  /**
    Function definition for the LLM to invoke.
   */
  definition: FunctionDefinition;

  /**
    Call the function based on the arguments in the {@link Tool.definition}.
   */
  call(args: ToolCallParams): Promise<CallToolResponse>;
}

export interface ToolCallParams<T = unknown> {
  functionArgs: T;

  /**
    Conversation in the DB. Useful for getting metadata to use in tool calls.
   */
  conversation?: Conversation;

  /**
    Data streamer with connection open to send events to the client.

    For example, you could use this to send updates about
    what the tool is doing to the client.

   */
  dataStreamer?: DataStreamer;

  /**
    Current Express.js request from the client.
    Useful for getting metadata to use in tool calls.
   */
  request?: ExpressRequest;
}

export type OpenAIChatCompletionWithoutUsage = Omit<ChatCompletions, "usage">;

export type OpenAiStreamingResponse =
  AsyncIterable<OpenAIChatCompletionWithoutUsage>;
export type OpenAiAwaitedResponse = ChatRequestAssistantMessage;

export interface CallToolResponse {
  /**
    Message to add to the conversation.
   */
  toolCallMessage: OpenAiChatMessage;

  /**
    If `true`, the user query should be rejected.
    You can use this to short circuit the conversation,
    and return the {@link ConversationConstants.NO_RELEVANT_CONTENT} message.
   */
  rejectUserQuery?: boolean;

  /**
    References to add to the {@link AssistantMessage} sent to the user.
   */
  references?: Reference[];
}

export type ToolCallDirective = FunctionCallPreset | FunctionName;

export interface LlmCallToolParams {
  /**
    Messages to send to the LLM.
   */
  messages: OpenAiChatMessage[];

  /**
    Conversation in the DB. Useful for getting metadata to use in tool calls.
   */
  conversation?: Conversation;

  /**
    Data streamer with connection open to send events to the client.

    For example, you could use this to send updates about
    what the tool is doing to the client.

   */
  dataStreamer?: DataStreamer;

  /**
    Current Express.js request from the client.
    Useful for getting metadata to use in tool calls.
   */
  request?: ExpressRequest;
}

/**
  LLM that responds to user queries. Provides both streaming and awaited options.
 */
export interface ChatLlm {
  answerQuestionStream(
    params: LlmAnswerQuestionParams
  ): Promise<OpenAiStreamingResponse>;
  answerQuestionAwaited(
    params: LlmAnswerQuestionParams
  ): Promise<OpenAiAwaitedResponse>;
  callTool?(params: LlmCallToolParams): Promise<CallToolResponse>;
}
