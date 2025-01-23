import { ObjectId } from "mongodb-rag-core/mongodb";
import { postCommentToSlack } from "./postCommentToSlack";
import "dotenv/config";
// TODO: how to test this?
describe("postCommentToSlack", () => {
  it("should post message to slack", async () => {
    const id = new ObjectId();
    await postCommentToSlack({
      slackToken: process.env.SLACK_BOT_TOKEN!,
      slackConversationId: process.env.SLACK_COMMENT_CONVERSATION_ID!,
      conversation: {
        _id: new ObjectId(),
        createdAt: new Date(),
        messages: [
          {
            role: "user",
            content: "hey",
            id: new ObjectId(),
            createdAt: new Date(),
          },
          {
            role: "assistant",
            content: "hello",
            rating: true,
            userComment: "good",
            id,
            createdAt: new Date(),
          },
        ],
      },
      messageWithCommentId: id,
    });
  });
});
