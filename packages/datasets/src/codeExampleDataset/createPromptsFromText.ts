import { OpenAI } from "mongodb-rag-core/openai";
import "dotenv/config";
import { END_SNIPPET, START_SNIPPET } from "./contextualizeCodeBlock";

export const makePrompt = (
  contextStr: string,
  numQuestions = 3
) => `Your job is to generate prompts for a Large Language Model (LLM) that a code example would complete.
This information will be used to train an LLM, so precision is incredibly important.
Given the contextual information, generate ${numQuestions} prompts that the code between ${START_SNIPPET} and ${END_SNIPPET} would complete.
Only generate questions about the code snippet wrapped with ${START_SNIPPET}{snippet}${END_SNIPPET}. Use the rest of the information as context to assist generating questions.
The questions should be short and direct, like something a developer would put in a code comment before writing the code in the code snippet.
A few examples:

Example 1:
Code snippet with context:
Here is how you can connect to MongoDB from Node.js:
${START_SNIPPET}
\`\`\`js
const MongoClient = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');

client.connect((err, db) => {
  if (err) {
    // Handle error
  }

  // Use the database
  const collection = db.collection('users');

  collection.insertOne({
    name: 'John Doe',
    age: 30
  }, (err, result) => {
    if (err) {
      // Handle error
    }

    // The document was inserted successfully
  });
});
\`\`\`
${END_SNIPPET}
Prompts: ["connect to mongodb node.js", "How do I connect to MongoDB from the Node.js driver?", "connect to mongodb"]

Example 2:
Code snippet with context:
To delete a document, use the collection.delete_many() method.
\`\`\`py
import pymongo

# Connect to MongoDB Atlas cluster
client = pymongo.MongoClient(""mongodb+srv://duet_mbd:duet_mbd@cluster0.k495o.mongodb.net/duet_mbd?retryWrites=true&w=majority"")

# Get the database
db = client.duet_mbd

# Delete the collection
db.emp_name.delete_many({""emp_name"": {""$regex"": ""peter""}})

# Print a message to indicate that the collection was successfully deleted
print(""Successfully deleted"")"
\`\`\`
Prompts: ["delete documents python", "How do I delete a document with Pymongo?", "delete a document"]

Code snippet with context:
${contextStr}`;

export function makeCreatePromptsFromText({
  openAiClient,
  model,
}: {
  openAiClient: OpenAI;
  model: string;
}) {
  return async ({
    text,
    numQuestions = 3,
  }: {
    text: string;
    numQuestions?: number;
  }) => {
    const result = await openAiClient.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: makePrompt(text, numQuestions),
        },
      ],
      max_tokens: 300,
      temperature: 0,
      functions: [createQuestionsFromTextFunctionDefinition],
      function_call: {
        name: createQuestionsFromTextFunctionDefinition.name,
      },
    });
    const prompts = JSON.parse(
      result?.choices?.[0].message?.function_call?.arguments ?? ""
    ).prompts as string[];
    return prompts;
  };
}

const createQuestionsFromTextFunctionDefinition: OpenAI.FunctionDefinition = {
  name: "create_prompts_from_text",
  description: "Create list of prompts from text",
  parameters: {
    type: "object",
    properties: {
      prompts: {
        type: "array",
        items: {
          type: "string",
        },
        description: "An array of prompt strings.",
      },
    },
    required: ["questions"],
    additionalProperties: false,
  },
};
