import {
  MongoClient,
  makeMongoDbEmbeddedContentStore,
  makeOpenAiEmbedder,
  makeMongoDbConversationsService,
  AppConfig,
  makeOpenAiChatLlm,
  SystemPrompt,
  makeDefaultFindContent,
  logger,
  makeApp,
  GenerateUserPromptFunc,
  makeRagGenerateUserPrompt,
  MakeUserMessageFunc,
} from "mongodb-chatbot-server";
import { OpenAIClient, OpenAIKeyCredential } from "@azure/openai";
import path from "path";
import { loadEnvVars } from "./loadEnvVars";

// Load project environment variables
const dotenvPath = path.join(__dirname, "..", "..", "..", ".env"); // .env at project root
const {
  MONGODB_CONNECTION_URI,
  MONGODB_DATABASE_NAME,
  VECTOR_SEARCH_INDEX_NAME,
  OPENAI_API_KEY,
  OPENAI_EMBEDDING_MODEL,
  OPENAI_CHAT_COMPLETION_MODEL,
} = loadEnvVars(dotenvPath);

// Create the OpenAI client
// for interacting with the OpenAI API (ChatGPT API and Embedding API)
const openAiClient = new OpenAIClient(new OpenAIKeyCredential(OPENAI_API_KEY));

// Chatbot LLM for responding to the user's query.
const llm = makeOpenAiChatLlm({
  openAiClient,
  deployment: OPENAI_CHAT_COMPLETION_MODEL,
  openAiLmmConfigOptions: {
    temperature: 0,
    maxTokens: 4096,
  },
});

// MongoDB data source for the content used in RAG.
// Generated with the Ingest CLI.
const embeddedContentStore = makeMongoDbEmbeddedContentStore({
  connectionUri: MONGODB_CONNECTION_URI,
  databaseName: MONGODB_DATABASE_NAME,
});

// Creates vector embeddings for user queries to find matching content
// in the embeddedContentStore using Atlas Vector Search.
const embedder = makeOpenAiEmbedder({
  openAiClient,
  deployment: OPENAI_EMBEDDING_MODEL,
  backoffOptions: {
    numOfAttempts: 3,
    maxDelay: 5000,
  },
});

// Find content in the embeddedContentStore using the vector embeddings
// generated by the embedder.
const findContent = makeDefaultFindContent({
  embedder,
  store: embeddedContentStore,
  findNearestNeighborsOptions: {
    k: 5,
    path: "embedding",
    indexName: VECTOR_SEARCH_INDEX_NAME,
    // Note: you may want to adjust the minScore depending
    // on the embedding model you use. We've found 0.9 works well
    // for OpenAI's text-embedding-ada-02 model for most use cases,
    // but you may want to adjust this value if you're using a different model.
    minScore: 0.9,
  },
});

// Constructs the user message sent to the LLM from the initial user message
// and the content found by the findContent function.
const makeUserMessage: MakeUserMessageFunc = async function ({
  content,
  originalUserMessage,
}) {
  const chunkSeparator = "~~~~~~";
  const context = content.map((c) => c.text).join(`\n${chunkSeparator}\n`);
  const contentForLlm = `Using the following information, answer the user query.
Different pieces of information are separated by "${chunkSeparator}".

Information:
${context}


User query: ${originalUserMessage}`;
  return { role: "user", content: contentForLlm };
};

// Generates the user prompt for the chatbot using RAG
const generateUserPrompt: GenerateUserPromptFunc = makeRagGenerateUserPrompt({
  findContent,
  makeUserMessage,
});

// System prompt for chatbot
const systemPrompt: SystemPrompt = {
  role: "system",
  content: `You are an assistant to users of the MongoDB Chatbot Framework.
Answer their questions about the framework in a friendly conversational tone.
Format your answers in Markdown.
Be concise in your answers.
If you do not know the answer to the question based on the information provided,
respond: "I'm sorry, I don't know the answer to that question. Please try to rephrase it. Refer to the below information to see if it helps."`,
};

// Create MongoDB collection and service for storing user conversations
// with the chatbot.
const mongodb = new MongoClient(MONGODB_CONNECTION_URI);
const conversations = makeMongoDbConversationsService(
  mongodb.db(MONGODB_DATABASE_NAME)
);

// Create the MongoDB Chatbot Server Express.js app configuration
const config: AppConfig = {
  conversationsRouterConfig: {
    maxInputLengthCharacters: 4096,
    llm,
    conversations,
    generateUserPrompt,
    systemPrompt,
  },
  maxRequestTimeoutMs: 30000,
};

// Start the server and clean up resources on SIGINT.
const PORT = process.env.PORT || 3000;
const startServer = async () => {
  logger.info("Starting server...");
  const app = await makeApp(config);
  const server = app.listen(PORT, () => {
    logger.info(`Server listening on port: ${PORT}`);
  });

  process.on("SIGINT", async () => {
    logger.info("SIGINT signal received");
    await mongodb.close();
    await embeddedContentStore.close();
    await new Promise<void>((resolve, reject) => {
      server.close((error: any) => {
        error ? reject(error) : resolve();
      });
    });
    process.exit(1);
  });
};

try {
  startServer();
} catch (e) {
  logger.error(`Fatal error: ${e}`);
  process.exit(1);
}
