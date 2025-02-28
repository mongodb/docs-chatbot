import { AssistantMessage, Conversation } from "mongodb-rag-core";
import { ObjectId } from "mongodb-rag-core/mongodb";
import { WebClient } from "@slack/web-api";
import { Blocks, Message as BuilderMessage, Md } from "slack-block-builder";
import { extractTracingData } from "./extractTracingData";
import { strict as assert } from "assert";
import slackify from "slackify-markdown";
import { getLlmAsAJudgeScores, LlmAsAJudge } from "./getLlmAsAJudgeScores";

export interface PostCommentToSlackParams {
  slackToken: string;
  slackConversationId: string;
  conversation: Conversation;
  messageWithCommentId: ObjectId;
  llmAsAJudge: LlmAsAJudge;
  braintrust?: {
    orgName: string;
    projectName: string;
  };
}
export async function postCommentToSlack({
  slackToken,
  slackConversationId,
  conversation,
  messageWithCommentId,
  llmAsAJudge,
  braintrust,
}: PostCommentToSlackParams) {
  const client = new WebClient(slackToken);
  const builder = await makeSlackMessageText(
    conversation,
    messageWithCommentId,
    slackConversationId,
    llmAsAJudge,
    braintrust
  );
  const res = await client.chat.postMessage({
    ...builder,
    unfurl_links: false,
    unfurl_media: false,
  });
  return res;
}

async function makeSlackMessageText(
  conversation: Conversation,
  messageWithCommentId: ObjectId,
  slackConversationId: string,
  llmAsAJudge: LlmAsAJudge,
  braintrust?: {
    orgName: string;
    projectName: string;
  }
) {
  const tracingData = extractTracingData(
    conversation.messages,
    messageWithCommentId
  );
  const {
    isVerifiedAnswer,
    llmDoesNotKnow,
    rejectQuery,
    tags,
    numRetrievedChunks,
    assistantMessage,
    userMessage,
  } = tracingData;

  assert(assistantMessage, "Assistant message not found");
  assert(userMessage, "User message not found");
  const { rating, userComment } = extractFeedback(assistantMessage);
  assert(rating !== undefined, "Rating not found");
  assert(userComment !== undefined, "User comment not found");

  const scores = await getLlmAsAJudgeScores(llmAsAJudge, tracingData);

  const messageId = messageWithCommentId.toHexString();
  const braintrustLogUrl = braintrust
    ? makeBraintrustLogUrl({
        orgName: braintrust.orgName,
        projectName: braintrust.projectName,
        traceId: messageId,
      })
    : undefined;

  const verifiedAnswerId = isVerifiedAnswer
    ? assistantMessage.metadata?.verifiedAnswer?._id
    : null;
  const verifiedAnswerMd = verifiedAnswerId
    ? `\n:white_check_mark: ${Md.bold(
        `Verified Answer:`
      )} ${verifiedAnswerId}}\n`
    : "";

  const feedbackMd = `${Md.bold(
    rating === true ? "👍 Positive Feedback" : "👎 Negative Feedback"
  )}
${verifiedAnswerMd}
${Md.bold("User Comment:")}
${userComment}`;

  const messagesMd = `${Md.blockquote(
    `${Md.bold(Md.emoji("bust_in_silhouette") + ` User`)}`
  )}

${slackify(fixNewLines(userMessage.content))}

${`${Md.blockquote(Md.bold(Md.emoji("robot_face") + ` Assistant`))}`}

${slackify(fixNewLines(assistantMessage.content))}`;

  const referencesMd =
    Md.bold("References:") +
    "\n" +
    (assistantMessage.references && assistantMessage?.references.length > 0
      ? `${assistantMessage.references
          .map((ref) => {
            return `${Md.listBullet(Md.link(ref.url, ref.title))}`;
          })
          .join("\n")}`
      : "No References");

  const messageMetadataMd = `${Md.bold("Metadata:")}

${Md.listBullet(`Verified Answer: ${isVerifiedAnswer ? "Yes" : "No"}`)}
${Md.listBullet(`LLM Does Not Know: ${llmDoesNotKnow ? "Yes" : "No"}`)}
${Md.listBullet(`Rejected Query: ${rejectQuery ? "Yes" : "No"}`)}
${Md.listBullet(`Number of Retrieved Chunks: ${numRetrievedChunks}`)}
${Md.listBullet(`Tags: ${tags.map(Md.codeInline).join(", ")}`)}`;

  const idMetadataMd = `Conversation ID: ${Md.codeInline(
    conversation._id.toHexString()
  )}
Message ID: ${Md.codeInline(messageId)}
${
  braintrustLogUrl
    ? `Braintrust Log: ${Md.link(braintrustLogUrl, messageId)}`
    : ""
}`;

  const scoresMd = `${Md.bold("Scores:")}
${
  scores
    ? Object.entries(scores)
        .map(([label, score]) => {
          return `${Md.listBullet(`${Md.bold(label)}: ${score}`)}`;
        })
        .join("\n")
    : "No LLM-as-Judge Scores"
}`;

  return BuilderMessage({
    channel: slackConversationId,
    text: "User Feedback",
  })
    .blocks(
      Blocks.Section({ text: feedbackMd }),
      Blocks.Divider(),
      Blocks.Section({ text: messagesMd }),
      Blocks.Section({ text: referencesMd }),
      Blocks.Divider(),
      Blocks.Section({ text: scoresMd }),
      Blocks.Divider(),
      Blocks.Section({ text: messageMetadataMd }),
      Blocks.Divider(),
      Blocks.Section({ text: idMetadataMd })
    )
    .asUser()
    .buildToObject();
}

function fixNewLines(text: string) {
  return text.replaceAll("\\n", "\n");
}

function extractFeedback(assistantMessage: AssistantMessage) {
  return {
    rating: assistantMessage.rating,
    userComment: assistantMessage.userComment,
  };
}

export function makeBraintrustLogUrl(args: {
  orgName: string;
  projectName: string;
  traceId: string;
}) {
  const urlEncodedTraceId = encodeURI(`id = "${args.traceId}"`);
  const searchFilter = encodeURI(
    `{"filter":[{"text":"${urlEncodedTraceId}"}]}`
  );
  return `https://www.braintrust.dev/app/${args.orgName}/p/${args.projectName}/logs?search=${searchFilter}&r=${args.traceId}`;
}
