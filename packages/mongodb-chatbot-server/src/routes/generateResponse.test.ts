import { References } from "mongodb-rag-core";
import { ObjectId } from "mongodb-rag-core/mongodb";
import { OpenAI } from "mongodb-rag-core/openai";
import {
  AwaitGenerateResponseParams,
  GenerateResponseParams,
  StreamGenerateResponseParams,
  awaitGenerateResponseMessage,
  generateResponse,
  streamGenerateResponseMessage,
} from "./generateResponse";
import {
  AssistantMessage,
  ChatLlm,
  Conversation,
  FunctionMessage,
  OpenAiChatMessage,
  ProcessingStreamEvent,
  makeDataStreamer,
} from "mongodb-rag-core";
import { strict as assert } from "assert";
import { createResponse } from "node-mocks-http";
import { Response as ExpressResponse } from "express";
import { EventEmitter } from "stream-json/Parser";

const testFuncName = "test_func";
const mockFunctionInvocation = {
  role: "assistant",
  content: "",
  function_call: {
    arguments: JSON.stringify({ foo: "bar" }),
    name: testFuncName,
  },
  refusal: null,
} satisfies OpenAI.ChatCompletionMessage;

const mockReject = "mock_reject";
const mockRejectFunctionInvocation = {
  role: "assistant",
  content: "",
  function_call: {
    arguments: JSON.stringify({ fizz: "buzz" }),
    name: mockReject,
  },
  refusal: null,
} satisfies OpenAI.ChatCompletionMessage;

const mockReferences: References = [
  { url: "https://example.com/ref", title: "Some title" },
];

const mockFunctionMessage = {
  name: testFuncName,
  role: "function",
  content: "bar",
} satisfies FunctionMessage satisfies OpenAiChatMessage;

const mockAssistantMessageContent = ["final ", "assistant ", "message"];
const mockAssistantMessage = {
  role: "assistant",
  content: mockAssistantMessageContent.join(""),
} satisfies AssistantMessage;

const mockLlmNotWorking = "llm_not_working";

const mockProcessingStreamEvent = {
  type: "processing",
  data: "Processing tool call",
} satisfies ProcessingStreamEvent;

const mockChatLlm: ChatLlm = {
  async answerQuestionAwaited({ messages }) {
    const latestMessage = messages[messages.length - 1];
    if (latestMessage.content === testFuncName) {
      return mockFunctionInvocation;
    }
    if (latestMessage.content === mockReject) {
      return mockRejectFunctionInvocation;
    }
    if (latestMessage.content === mockLlmNotWorking) {
      throw new Error("LLM not working");
    }
    return mockAssistantMessage;
  },
  answerQuestionStream: async ({ messages }) =>
    (async function* () {
      let count = 0;
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.content === testFuncName) {
        yield {
          id: count.toString(), // Unique ID for each item
          created: Date.now(),
          choices: [
            {
              index: 0,
              finish_reason: "stop",
              delta: {
                role: "assistant",
                content: "",
                toolCalls: [],
                function_call: mockFunctionInvocation.function_call,
              },
            },
          ],
          promptFilterResults: [],
        };
        return;
      }
      if (latestMessage.content === mockReject) {
        yield {
          id: count.toString(), // Unique ID for each item
          created: Date.now(),
          choices: [
            {
              index: 0,
              finish_reason: "stop",
              delta: {
                role: "assistant",
                content: "",
                toolCalls: [],
                function_call: mockRejectFunctionInvocation.function_call,
              },
            },
          ],
          promptFilterResults: [],
        };
        return;
      }
      if (latestMessage.content === mockLlmNotWorking) {
        throw new Error("LLM not working");
      }
      while (count < mockAssistantMessageContent.length) {
        yield {
          id: count.toString(), // Unique ID for each item
          created: Date.now(),
          choices: [
            {
              index: 0,
              finish_reason: "stop",
              delta: {
                role: "assistant",
                content: mockAssistantMessageContent[count],
                toolCalls: [],
              },
            },
          ],
          promptFilterResults: [],
        };
        count++;
      }
    })(),
  async callTool({ messages, dataStreamer }) {
    const latestMessage = messages[messages.length - 1] as AssistantMessage;
    assert(latestMessage.functionCall, "must be a function call");
    if (dataStreamer?.connected) {
      dataStreamer.streamData(mockProcessingStreamEvent);
    }
    if (latestMessage.functionCall.name === mockReject) {
      return {
        toolCallMessage: mockFunctionMessage,
        rejectUserQuery: true,
      };
    } else {
      return {
        toolCallMessage: mockFunctionMessage,
        references: mockReferences,
      };
    }
  },
};

const llmConversation: OpenAiChatMessage[] = [
  { role: "user", content: "hello" },
];
const references: References = [
  { url: "https://example.com", title: "Example" },
];
const reqId = "foo";
const llmNotWorkingMessage = "llm not working";
const noRelevantContentMessage = "no relevant content";
const conversation: Conversation = {
  _id: new ObjectId(),
  createdAt: new Date(),
  messages: [],
};
const dataStreamer = makeDataStreamer();

describe("generateResponse", () => {
  const baseArgs = {
    llm: mockChatLlm,
    reqId,
    llmNotWorkingMessage,
    noRelevantContentMessage,
    conversation,
    dataStreamer,
    latestMessageText: "hello",
    async generateUserPrompt({ userMessageText }) {
      return {
        references,
        userMessage: {
          role: "user" as const,
          content: userMessageText,
        },
      };
    },
  } satisfies Omit<GenerateResponseParams, "shouldStream">;
  let res: ReturnType<typeof createResponse> & ExpressResponse;
  beforeEach(() => {
    res = createResponse({
      eventEmitter: EventEmitter,
    });
    dataStreamer.connect(res);
  });

  afterEach(() => {
    if (dataStreamer.connected) {
      dataStreamer?.disconnect();
    }
  });
  it("should stream response if shouldStream is true", async () => {
    await generateResponse({ ...baseArgs, shouldStream: true });
    const data = res._getData();

    for (let i = 0; i < 3; i++) {
      expect(data).toContain(
        `data: {"type":"delta","data":"${mockAssistantMessageContent[i]}"}`
      );
    }
    expect(data).toContain(
      `{"type":"references","data":${JSON.stringify(references)}}`
    );
  });

  it("should await response if shouldStream is false", async () => {
    await generateResponse({ ...baseArgs, shouldStream: false });
    const data = res._getData();
    expect(data).toBe("");
  });
  it("should stream metadata", async () => {
    const metadata = { foo: "bar", baz: 42 };
    const staticResponse = {
      role: "assistant",
      content: "static response",
      metadata,
    } satisfies AssistantMessage;

    await generateResponse({
      ...baseArgs,
      shouldStream: true,
      async generateUserPrompt() {
        return {
          userMessage: {
            role: "user",
            content: "test metadata",
          },
          staticResponse,
        };
      },
    });

    const data = res._getData();

    const expectedMetadataEvent = `data: {"type":"metadata","data":${JSON.stringify(
      metadata
    )}}\n\n`;
    expect(data).toContain(expectedMetadataEvent);
  });

  it("passes clientContext data to the generateUserPrompt function", async () => {
    const generateUserPrompt = jest.fn(async (args) => {
      let content = args.userMessageText;
      if (args.clientContext) {
        content += `\n\nThe user provided the following context: ${JSON.stringify(
          args.clientContext
        )}`;
      }
      return {
        userMessage: {
          role: "user" as const,
          content,
        },
      };
    });
    const latestMessageText = "hello";
    const clientContext = {
      location: "Chicago, IL",
      preferredLanguage: "Spanish",
    };
    const { messages } = await generateResponse({
      ...baseArgs,
      shouldStream: false,
      generateUserPrompt,
      latestMessageText,
      clientContext,
    });
    expect(messages.at(-2)?.content).toContain(
      `The user provided the following context: {"location":"Chicago, IL","preferredLanguage":"Spanish"}`
    );
    expect(generateUserPrompt).toHaveBeenCalledWith({
      userMessageText: latestMessageText,
      clientContext,
      conversation,
      reqId,
    });
  });

  it("should send a static message", async () => {
    const userMessage = {
      role: "user",
      content: "bad!",
    } satisfies OpenAiChatMessage;
    const staticResponse = {
      role: "assistant",
      content: "static response",
    } satisfies OpenAiChatMessage;
    const { messages } = await generateResponse({
      ...baseArgs,
      shouldStream: false,
      async generateUserPrompt() {
        return {
          userMessage,
          staticResponse,
        };
      },
    });
    expect(messages).toMatchObject([userMessage, staticResponse]);
  });
  it("should reject query", async () => {
    const userMessage = {
      role: "user",
      content: "bad!",
    } satisfies OpenAiChatMessage;
    const { messages } = await generateResponse({
      ...baseArgs,
      shouldStream: false,
      async generateUserPrompt() {
        return {
          userMessage,
          rejectQuery: true,
        };
      },
    });
    expect(messages).toMatchObject([
      {
        role: "user",
        content: "bad!",
      },
      {
        role: "assistant",
        content: noRelevantContentMessage,
      },
    ]);
  });
});

describe("awaitGenerateResponseMessage", () => {
  const baseArgs = {
    llm: mockChatLlm,
    llmConversation,
    references,
    reqId,
    llmNotWorkingMessage,
    noRelevantContentMessage,
    conversation,
  } satisfies AwaitGenerateResponseParams;
  it("should generate assistant response if no tools", async () => {
    const { messages } = await awaitGenerateResponseMessage(baseArgs);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject(mockAssistantMessage);
  });
  it("should pass through references with final assistant message", async () => {
    const { messages } = await awaitGenerateResponseMessage(baseArgs);
    expect(
      (messages[messages.length - 1] as AssistantMessage).references
    ).toMatchObject(references);
  });
  it("should call tool before responding", async () => {
    const { messages } = await awaitGenerateResponseMessage({
      ...baseArgs,
      llmConversation: [{ role: "user", content: testFuncName }],
    });
    expect(messages).toHaveLength(3);
    expect(messages[messages.length - 2]).toMatchObject(mockFunctionMessage);
    expect(messages[messages.length - 1]).toMatchObject(mockAssistantMessage);
  });
  it("should pass references from a tool call", async () => {
    const { messages } = await awaitGenerateResponseMessage({
      ...baseArgs,
      llmConversation: [{ role: "user", content: testFuncName }],
    });

    expect(messages).toHaveLength(3);
    expect(messages[messages.length - 2]).toMatchObject(mockFunctionMessage);
    expect(messages[messages.length - 1]).toMatchObject(mockAssistantMessage);
    expect(
      (messages[messages.length - 1] as AssistantMessage).references
    ).toMatchObject([...references, ...mockReferences]);
  });

  it("should reject input in a tool call", async () => {
    const { messages } = await awaitGenerateResponseMessage({
      ...baseArgs,
      llmConversation: [
        {
          role: "user",
          content: mockReject,
        },
      ],
    });
    expect(messages[messages.length - 1]).toMatchObject({
      role: "assistant",
      content: noRelevantContentMessage,
    });
  });
  it("should only send vector search results and references if LLM not working", async () => {
    const { messages } = await awaitGenerateResponseMessage({
      ...baseArgs,
      llmConversation: [
        {
          role: "user",
          content: mockLlmNotWorking,
        },
      ],
    });
    const finalMessage = messages[messages.length - 1] as AssistantMessage;
    expect(finalMessage).toMatchObject({
      role: "assistant",
      content: llmNotWorkingMessage,
    });
    expect(finalMessage.references?.length).toBeGreaterThanOrEqual(1);
  });
});

describe("streamGenerateResponseMessage", () => {
  let res: ReturnType<typeof createResponse> & ExpressResponse;
  beforeEach(() => {
    res = createResponse({
      eventEmitter: EventEmitter,
    });
    dataStreamer.connect(res);
  });

  afterEach(() => {
    if (dataStreamer.connected) {
      dataStreamer?.disconnect();
    }
  });

  const baseArgs = {
    llm: mockChatLlm,
    llmConversation,
    references,
    reqId,
    llmNotWorkingMessage,
    noRelevantContentMessage,
    conversation,
    dataStreamer,
    shouldGenerateMessage: true,
  } satisfies StreamGenerateResponseParams;

  it("should generate assistant response if no tools", async () => {
    const { messages } = await streamGenerateResponseMessage(baseArgs);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject(mockAssistantMessage);
    const data = res._getData();
    for (let i = 0; i < 3; i++) {
      expect(data).toContain(
        `data: {"type":"delta","data":"${mockAssistantMessageContent[i]}"}`
      );
    }
  });
  it("should pass through references with final assistant message", async () => {
    const { messages } = await streamGenerateResponseMessage(baseArgs);
    expect(
      (messages[messages.length - 1] as AssistantMessage).references
    ).toMatchObject(references);
    const data = res._getData();
    expect(data).toContain(
      `data: {"type":"references","data":${JSON.stringify(references)}}`
    );
  });
  it("should stream references if shouldGenerateMessage is true", async () => {
    await streamGenerateResponseMessage(baseArgs);
    const data = res._getData();

    expect(data).toContain(
      `{"type":"references","data":${JSON.stringify(references)}}`
    );
  });
  it("should stream references if shouldGenerateMessage is false", async () => {
    await streamGenerateResponseMessage({
      ...baseArgs,
      shouldGenerateMessage: false,
      llmConversation: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" },
      ],
    });
    const data = res._getData();
    expect(data).toContain(
      `{"type":"references","data":${JSON.stringify(references)}}`
    );
  });
  it("should call tool before responding", async () => {
    const { messages } = await streamGenerateResponseMessage({
      ...baseArgs,
      llmConversation: [{ role: "user", content: testFuncName }],
    });
    expect(messages).toHaveLength(3);
    expect(messages[messages.length - 2]).toMatchObject(mockFunctionMessage);
    expect(messages[messages.length - 1]).toMatchObject(mockAssistantMessage);
    const data = res._getData();
    expect(data).toContain(
      `data: {"type":"processing","data":"${mockProcessingStreamEvent.data}"}`
    );
    for (let i = 0; i < 3; i++) {
      expect(data).toContain(
        `data: {"type":"delta","data":"${mockAssistantMessageContent[i]}"}`
      );
    }
    expect(data).toContain(
      `{"type":"references","data":${JSON.stringify(
        references.concat(mockReferences)
      )}}`
    );
  });
  it("should pass references from a tool call", async () => {
    const { messages } = await streamGenerateResponseMessage({
      ...baseArgs,
      llmConversation: [{ role: "user", content: testFuncName }],
    });

    expect(messages).toHaveLength(3);
    expect(messages[messages.length - 2]).toMatchObject(mockFunctionMessage);
    expect(messages[messages.length - 1]).toMatchObject(mockAssistantMessage);
    expect(
      (messages[messages.length - 1] as AssistantMessage).references
    ).toMatchObject([...references, ...mockReferences]);
    const data = res._getData();
    expect(data).toContain(
      `{"type":"references","data":${JSON.stringify(
        references.concat(mockReferences)
      )}}`
    );
  });

  it("should reject input in a tool call", async () => {
    const { messages } = await streamGenerateResponseMessage({
      ...baseArgs,
      llmConversation: [
        {
          role: "user",
          content: mockReject,
        },
      ],
    });
    expect(messages[messages.length - 1]).toMatchObject({
      role: "assistant",
      content: noRelevantContentMessage,
    });
    const data = res._getData();
    expect(data).toContain(
      `data: {"type":"processing","data":"${mockProcessingStreamEvent.data}"}`
    );
    expect(data).toContain(
      `data: {"type":"delta","data":"${noRelevantContentMessage}"}`
    );
    expect(data).toContain(
      `data: {"type":"references","data":${JSON.stringify(references)}}`
    );
  });
  it("should only send vector search results and references if LLM not working", async () => {
    const { messages } = await streamGenerateResponseMessage({
      ...baseArgs,
      llmConversation: [
        {
          role: "user",
          content: mockLlmNotWorking,
        },
      ],
    });
    const finalMessage = messages[messages.length - 1] as AssistantMessage;
    expect(finalMessage).toMatchObject({
      role: "assistant",
      content: llmNotWorkingMessage,
    });
    expect(finalMessage.references?.length).toBeGreaterThanOrEqual(1);

    const data = res._getData();
    expect(data).toContain(
      `data: {"type":"delta","data":"${llmNotWorkingMessage}"}`
    );
    expect(data).toContain(
      `data: {"type":"references","data":${JSON.stringify(references)}}`
    );
  });
  it("should stream metadata", async () => {
    const metadata = { foo: "bar", baz: 42 };
    await streamGenerateResponseMessage({
      ...baseArgs,
      metadata,
    });
    const data = res._getData();

    const expectedMetadataEvent = `data: {"type":"metadata","data":${JSON.stringify(
      metadata
    )}}`;
    expect(data).toContain(expectedMetadataEvent);
  });
});
