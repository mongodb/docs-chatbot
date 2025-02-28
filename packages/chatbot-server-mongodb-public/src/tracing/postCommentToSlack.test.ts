import { ObjectId } from "mongodb-rag-core/mongodb";
import { makeBraintrustLogUrl, postCommentToSlack } from "./postCommentToSlack";
import "dotenv/config";
describe.skip("postCommentToSlack", () => {
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
            references: [
              {
                title: "title",
                url: "https://example.com",
              },
            ],
          },
        ],
      },
      messageWithCommentId: id,
      llmAsAJudge: {
        judgeEmbeddingModel: process.env.JUDGE_EMBEDDING_MODEL!,
        judgeModel: process.env.JUDGE_LLM!,
        openAiConfig: {
          azureOpenAi: {
            apiKey: process.env.OPENAI_API_KEY!,
            endpoint: process.env.OPENAI_ENDPOINT!,
            apiVersion: process.env.OPENAI_API_VERSION!,
          },
        },
      },
    });
  });
});

describe("makeBraintrustLogUrl", () => {
  it("should make a valid braintrust log url", () => {
    const url = makeBraintrustLogUrl({
      orgName: "mongodb-education-ai",
      projectName: "chatbot-responses-prod",
      traceId: "67c2023c218d1c08ae1cf0ed",
    });
    expect(url).toBe(
      "https://www.braintrust.dev/app/mongodb-education-ai/p/chatbot-responses-prod/logs?search=%7B%22filter%22:%5B%7B%22text%22:%22id%2520=%2520%252267c2023c218d1c08ae1cf0ed%2522%22%7D%5D%7D&r=67c2023c218d1c08ae1cf0ed"
    );
  });
});
