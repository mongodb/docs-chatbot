import { Router } from "express";
import { EmbeddingService } from "../../services/embeddings";
import { LlmProvider } from "../../services/llm";
import { DataStreamerServiceInterface } from "../../services/dataStreamer";
import {
  ConversationsServiceInterface,
  Message,
} from "../../services/conversations";
import { ContentServiceInterface } from "../../services/content";
import { makeRateMessageRoute } from "./rateMessage";
import { makeCreateConversationRoute } from "./createConversation";
import { makeAddMessageToConversationRoute } from "./addMessageToConversation";

// TODO: for all non-2XX or 3XX responses, see how/if can better implement
// error handling. can/should we pass stuff to next() and process elsewhere?
export interface ConversationsRouterParams<T, U> {
  llm: LlmProvider<T, U>;
  embeddings: EmbeddingService;
  dataStreamer: DataStreamerServiceInterface;
  content: ContentServiceInterface;
  conversations: ConversationsServiceInterface;
}
export function makeConversationsRouter({
  llm,
  embeddings,
  dataStreamer,
  content,
  conversations,
}: ConversationsRouterParams<T, U>) {
  const conversationsRouter = Router();

  /**
   * Create new conversation.
   */
  conversationsRouter.post("/", makeCreateConversationRoute({ conversations }));

  /**
   * Create a new message from the user and get response from the LLM.
   */
  conversationsRouter.post(
    "/:conversationId/messages",
    makeAddMessageToConversationRoute({
      content,
      conversations,
      embeddings,
      llm,
      dataStreamer,
    })
  );

  /**
   * Rate a message.
   */
  conversationsRouter.post(
    "/:conversationId/messages/:messageId/rating",
    makeRateMessageRoute({ conversations })
  );

  return conversationsRouter;
}
