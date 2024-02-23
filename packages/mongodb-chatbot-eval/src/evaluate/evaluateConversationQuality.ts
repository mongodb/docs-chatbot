import { ConversationGeneratedData } from "../generate/GeneratedDataStore";
import { EvaluateQualityFunc } from "./EvaluateQualityFunc";
import { strict as assert } from "assert";
import { checkResponseQuality } from "./checkResponseQuality";
import { ObjectId, OpenAIClient } from "mongodb-rag-core";
import { EvalResult } from "./EvaluationStore";
import { stringifyConversation } from "./stringifyConversation";

export interface EvaluateConversationQualityParams {
  openAiClient: OpenAIClient;

  /**
    The name of the OpenAI ChatGPT API deployment to use.
    @example "gpt-3.5-turbo"
   */
  deploymentName: string;
}

/**
  Construct a a {@link EvaluateQualityFunc} that evaluates the quality of a conversation
  using an OpenAI ChatGPT LLM.

  The returned {@link EvalResult} has the following properties:

  - In {@link EvalResult.result}, `1` if the conversation meets quality standards and `0` if it does not.
  - In {@link EvalResult.metadata}, `reason` for the result, as generated by the LLM.
 */
export function makeEvaluateConversationQuality({
  openAiClient,
  deploymentName,
}: EvaluateConversationQualityParams): EvaluateQualityFunc {
  return async ({ runId, generatedData }) => {
    assert(
      generatedData.type === "conversation",
      "Invalid data type. Expected 'conversation' data."
    );
    const conversationData = generatedData as ConversationGeneratedData;
    const {
      data: { messages },
    } = conversationData;
    const conversationTranscript = stringifyConversation(messages);
    const { qualitativeFinalAssistantMessageExpectation } =
      conversationData.evalData;
    const { meetsChatQualityStandards, reason } = await checkResponseQuality({
      deploymentName,
      openAiClient,
      expectedOutputDescription: qualitativeFinalAssistantMessageExpectation,
      received: conversationTranscript,
    });
    const result = {
      _id: new ObjectId(),
      generatedDataId: generatedData._id,
      commandRunMetadataId: runId,
      evalName: "conversation_quality",
      result: meetsChatQualityStandards ? 1 : 0,
      createdAt: new Date(),
      metadata: {
        reason,
        conversationTranscript,
      },
    } satisfies EvalResult;
    return result;
  };
}
