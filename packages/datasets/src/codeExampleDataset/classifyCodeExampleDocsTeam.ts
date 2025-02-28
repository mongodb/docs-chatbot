/**
   @fileoverview Contains classification as defined by MongoDB Docs team (https://docs.google.com/document/d/199fTaNlvMXb1GmloQRkh8MYPfYyuQakaYIsAuZvgKvU/)
 */
import { ClassificationType, makeClassifier } from "mongodb-rag-core";

const classificationTypes = [
  {
    type: "api_method_signature",
    description:
      "API method signature code block showing an API method name and arguments",
    examples: [
      {
        // From https://www.mongodb.com/docs/languages/python/pymongo-driver/current/write/insert/#insert-one-document
        text: `\`\`\`\`python
sample_restaurants.restaurants.insert_one({"name" : "Mongo's Burgers"})
        \`\`\``,
        reason:
          'Shows the minimum required arguments for the "insert_one" method. Therefore this is an API method signature.',
      },
      {
        // From https://www.mongodb.com/docs/manual/reference/method/db.collection.insertOne/#syntax
        text: `\`\`\`\`javascript
db.collection.insertOne(
    <document>,
    {
      writeConcern: <document>
    }
)
\`\`\``,
        reason:
          "Complete API method signature, showing all possible arguments in an abstract form. Therefore this is an API method signature.",
      },
    ],
  },
  {
    type: "return_example",
    description:
      "A JSON blob, example document, or other return object type demonstrating what a user might expect from executing a piece of code",
    // TODO: add other examples
    examples: [],
  },
  {
    type: "example_configuration_object",
    description:
      "Example object, often represented in YAML or JSON, enumerating parameters and their types",
    // TODO: add other examples
    examples: [],
  },
  {
    type: "usage_example",
    description:
      "A longer code snippet that establishes parameters, performs basic set-up code, and includes the larger context to demonstrate how to accomplish a task",
    // TODO: add other examples
    examples: [],
  },
  {
    type: "sample_application",
    description:
      "Runnable applications that connect more discrete pieces of code, and may include error handling, framework integrations, or User Interface elements",
    // TODO: add other examples
    examples: [],
  },
  // Note: adding this b/c there will certainly be types of code examples that don't cleanly fit into these buckets.
  // For example, if there was a file tree in a code block.
  {
    type: "unknown",
    description:
      "Unknown classification type. The code example doesn't easily fit into any of the other categories.",
  },
] as const satisfies ClassificationType[];

export type CodeExampleClassification =
  (typeof classificationTypes)[number]["type"];

export const makeClassifyCodeExampleDocsTeam = ({
  openAiClient,
  model,
}: Pick<Parameters<typeof makeClassifier>[0], "openAiClient" | "model">) =>
  makeClassifier({
    classificationTypes,
    chainOfThought: true,
    openAiClient,
    model,
  });
