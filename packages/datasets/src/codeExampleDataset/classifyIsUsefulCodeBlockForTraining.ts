import { OpenAI } from "mongodb-rag-core/openai";
import {
  AugmentedAstExtractedCodeblock,
  CodeExampleUtility,
} from "./AstExtractedCodeBlock";

const classifyCodeExampleFunc: OpenAI.FunctionDefinition = {
  name: "classify_code_example",
  description: "Classify whether code example useful for training an LLM",
  parameters: {
    type: "object",
    properties: {
      usefulnessReasoning: {
        type: "string",
        description:
          "Reasoning for why the code example is useful or not. Think step by step. Be concise.",
      },
      isUseful: {
        type: "boolean",
        description: "Whether the code example is useful for training an LLM",
      },
    },
    required: ["isUseful"],
    additionalProperties: false,
  },
};

function makeUserMessage(
  codeExample: Pick<
    AugmentedAstExtractedCodeblock,
    "code" | "programmingLanguage" | "prompts"
  >
): OpenAI.Chat.ChatCompletionUserMessageParam {
  return {
    role: "user",
    content: JSON.stringify(
      {
        prompts: codeExample.prompts,
        code: `\`\`\`${codeExample.programmingLanguage ?? ""}
${codeExample.code}
\`\`\``,
      },
      null,
      2
    ),
  };
}

function makeAssistantFunctionCallMessage(
  usefulnessReasoning: string,
  isUseful: boolean
): OpenAI.Chat.ChatCompletionAssistantMessageParam {
  return {
    role: "assistant",
    content: "",
    function_call: {
      name: classifyCodeExampleFunc.name,
      arguments: JSON.stringify({ usefulnessReasoning, isUseful }, null, 2),
    },
  };
}

const fewShotExamples: OpenAI.Chat.ChatCompletionMessageParam[] = [
  // Example 1
  makeUserMessage({
    prompts: [
      "store current time in GitHub Actions environment variable",
      "How to set an environment variable in GitHub Actions with the current date and time?",
      "echo current date and time to GITHUB_ENV in GitHub Actions",
    ],
    code: `echo "CURRENT_TIME=$(date +'%Y-%m-%d_%s')" >> $GITHUB_ENV`,
    programmingLanguage: null,
  }),
  makeAssistantFunctionCallMessage(
    "The example shows how to add the current date and time to an environment variable. It does not relate to any MongoDB product or feature.",
    false
  ),
  // Example 2
  makeUserMessage({
    prompts: [
      "How to display MapMarkers for each item in an array using SwiftUI Map",
      "Add annotations to a SwiftUI Map using an array of items",
      "Displaying custom locations on a SwiftUI Map with MapMarker",
    ],
    programmingLanguage: "swift",
    code: `Map(coordinateRegion: $region,
  interactionModes: .all,
  showsUserLocation: true,
  annotationItems: annotationItems) { item in
  MapMarker(
      coordinate: item.coordinate,
      tint: item.tint)
}`,
  }),
  makeAssistantFunctionCallMessage(
    "The example shows how to create a map marker in SwiftUI. It does not relate to any MongoDB product or feature.",
    false
  ),
  // Example 3
  makeUserMessage({
    code: `[
  {
      "$search": {
          "text": {
              "query": "korean",
              "path": [ "cuisine" ],
              "fuzzy": {
                  "maxEdits": 2
              }
          }
      }
  },
  {
      "$project": {
          "_id": 0,
          "name": 1,
          "cuisine": 1,
          "location": 1,
          "rating": 1,
          "score": {
              "$meta": "searchScore"
          }
      }
  }
]`,
    programmingLanguage: "json",
    prompts: [
      "How to perform a fuzzy text search in MongoDB?",
      "How to use the $search aggregation stage in MongoDB?",
      "How to project specific fields in MongoDB aggregation?",
    ],
  }),
  makeAssistantFunctionCallMessage(
    "This example shows how to use MongoDB Atlas Search in an aggregation pipeline. It relates to the MongoDB product Atlas Search.",
    true
  ),
  // Example 4
  makeUserMessage({
    programmingLanguage: "go",
    code: `package main

import (
"context"
"encoding/json"
"fmt"
"net/http"
"os"
"time"
"github.com/gorilla/mux"
"go.mongodb.org/mongo-driver/bson"
"go.mongodb.org/mongo-driver/mongo"
"go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client
var collection *mongo.Collection

type Tweet struct {
ID       int64  \`json:"_id,omitempty" bson:"_id,omitempty"\`
FullText string \`json:"full_text,omitempty" bson:"full_text,omitempty"\`
User     struct {
ScreenName string \`json:"screen_name" bson:"screen_name"\`
} \`json:"user,omitempty" bson:"user,omitempty"\`
}

func GetTweetsEndpoint(response http.ResponseWriter, request *http.Request) {}
func SearchTweetsEndpoint(response http.ResponseWriter, request *http.Request) {}

func main() {
fmt.Println("Starting the application...")
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
client, err := mongo.Connect(ctx, options.Client().ApplyURI(os.Getenv("MONGODB_URI")))
defer func() {
if err = client.Disconnect(ctx); err != nil {
panic(err)
}
}()
collection = client.Database("synonyms").Collection("tweets")
router := mux.NewRouter()
router.HandleFunc("/tweets", GetTweetsEndpoint).Methods("GET")
router.HandleFunc("/search", SearchTweetsEndpoint).Methods("GET")
http.ListenAndServe(":12345", router)
}`,
    prompts: [
      "create a simple API with Go and MongoDB",
      "How to connect to MongoDB and set up routes in Go?",
      "initialize MongoDB client and define routes in Go",
    ],
  }),
  makeAssistantFunctionCallMessage(
    "The example shows how to create a simple API with Go and MongoDB. It relates to the MongoDB Go driver.",
    true
  ),
  // Example 5
  makeUserMessage({
    programmingLanguage: "go",
    code: `"func GetTweetsEndpoint(response http.ResponseWriter, request *http.Request) {}
func SearchTweetsEndpoint(response http.ResponseWriter, request *http.Request) {}"`,
    prompts: [
      "define API endpoint functions in Go",
      "How to create API endpoint functions in Golang?",
      "implementing API endpoints in Go",
    ],
  }),
  makeAssistantFunctionCallMessage(
    "The example shows how to define API endpoint functions in Go. It doesn't relate to any MongoDB product or feature.",
    false
  ),
  // Example 6
  makeUserMessage({
    programmingLanguage: "csharp",
    code: `class Person : RealmObject
{
    public string Name { get; set; }

    public Person(string name)
    {
        ValidateName(name);

        Name = name;
    }

    // This is used by Realm, even though it's private
    private Person()
    {
    }
}`,
    prompts: [
      "define a class with a private parameterless constructor in C#",
      "How to create a RealmObject subclass with a private constructor in C#?",
      "implement a class with both public and private constructors in C#",
    ],
  }),
  makeAssistantFunctionCallMessage(
    "This example shows how to create a RealmObject subclass with a private constructor in C#. It relates to the MongoDB Realm product.",
    true
  ),
  // Example 7
  makeUserMessage({
    programmingLanguage: "shell",
    code: `mkdir search-with-unionwith
cd search-with-unionwith
dotnet new console`,
    prompts: [
      "initialize a .NET console project",
      "How to create and initialize a new .NET console project using the command line?",
      "set up a new .NET console application",
    ],
  }),
  makeAssistantFunctionCallMessage(
    "The example shows how to initialize a .NET console project. .NET is not a MongoDB product or feature. The code example does not relate to any MongoDB product or feature.",
    false
  ),
  // Example 8
  makeUserMessage({
    programmingLanguage: "shell",
    code: "atlas deployments setup myLocalRs1 --type local --force",
    prompts: [
      "create a local MongoDB deployment using atlas CLI",
      "How to setup a local MongoDB deployment non-interactively?",
      "use atlas CLI to setup a local MongoDB deployment",
    ],
  }),
  makeAssistantFunctionCallMessage(
    "The example shows how to create a local MongoDB deployment using the Atlas CLI. It relates to the MongoDB Atlas product.",
    true
  ),
  // Example 9
  makeUserMessage({
    programmingLanguage: "python",
    code: `with gr.Blocks(theme=Base(), title="Question Answering App using Vector Search + RAG") as demo:
    gr.Markdown(
        """
        # Question Answering App using Atlas Vector Search + RAG Architecture
        """)
    textbox = gr.Textbox(label="Enter your Question:")
    with gr.Row():
        button = gr.Button("Submit", variant="primary")
    with gr.Column():
        output1 = gr.Textbox(lines=1, max_lines=10, label="Output with just Atlas Vector Search (returns text field as is):")
        output2 = gr.Textbox(lines=1, max_lines=10, label="Output generated by chaining Atlas Vector Search to Langchain's RetrieverQA + OpenAI LLM:")

# Call query_data function upon clicking the Submit button

    button.click(query_data, textbox, outputs=[output1, output2])

demo.launch()`,
    prompts: [
      "create a Gradio interface for a question answering app",
      "How to set up a Gradio Blocks interface with text input and output?",
      "implement Gradio web interface for vector search and RAG architecture",
    ],
  }),
  makeAssistantFunctionCallMessage(
    "The example shows how to create a Gradio interface for a question answering app. It seems that the Gradio app has something to do with MongoDB Atlas Vector Search. However, the code example does not directly relate to any MongoDB product or feature.",
    false
  ),
  // Example 10
  makeUserMessage({
    programmingLanguage: "json",
    code: `{
  "name": "<Service Name>",
  "type": "http",
  "config": {}
}`,
    prompts: [
      "define a deprecated HTTP service configuration in JSON",
      "How to configure a deprecated HTTP service in JSON format?",
      "JSON configuration for a deprecated HTTP service",
    ],
  }),
  makeAssistantFunctionCallMessage(
    'The example shows how to define a deprecated HTTP service configuration in JSON. It is not clear what a "deprecated HTTP service configuration is". The code example does clearly not relate to any MongoDB product or feature.',
    false
  ),
];

const systemPrompt = `You are an expert data annotator whose job job is to classify whether some code examples and accompanying descriptions are:

1. Related to MongoDB products or features. Features/products include things like MongoDB Atlas, MongoDB drivers, Realm, etc.
2. Useful for training a language model to be good at MongoDB-related tasks. If you are unsure if a code example is useful for training the model on MongoDB, classify it as "not useful". Err to the side of caution. It's better to have fewer examples than to have incorrect examples.

For each classification task, you will be given a code example and a set of prompts.
Only the code examples that you deem useful will be used to train an LLM.
Since this information will be used to train an LLM, precision is incredibly important.`;
const systemMessage = {
  role: "system",
  content: systemPrompt,
} satisfies OpenAI.Chat.ChatCompletionSystemMessageParam;

export function makeClassifyIsUsefulCodeBlockForTraining({
  openAiClient,
  model,
}: {
  openAiClient: OpenAI;
  model: string;
}) {
  return async function classifyCodeExample({
    codeExample,
  }: {
    codeExample: AugmentedAstExtractedCodeblock;
  }): Promise<CodeExampleUtility> {
    const userMessage = {
      role: "user",
      content: `\`\`\`${codeExample.programmingLanguage ?? ""}
${codeExample.code}
\`\`\``,
    } satisfies OpenAI.Chat.ChatCompletionUserMessageParam;
    const result = await openAiClient.chat.completions.create({
      model,
      messages: [systemMessage, ...fewShotExamples, userMessage],
      temperature: 0,
      max_tokens: 500,
      functions: [classifyCodeExampleFunc],
      function_call: {
        name: classifyCodeExampleFunc.name,
      },
    });
    const utility = JSON.parse(
      result.choices[0].message?.function_call?.arguments ?? ""
    ) as CodeExampleUtility;
    return utility;
  };
}
