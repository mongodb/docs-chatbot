import { OpenAI } from "mongodb-rag-core/openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { PromisePool } from "@supercharge/promise-pool";
import { ObjectId } from "mongodb-rag-core/mongodb";
import { GenerationNode, WithParentNode } from "./GenerationNode";

export type GenerateChildren<
  ParentNode extends GenerationNode<unknown> | null,
  ChildNode extends WithParentNode<GenerationNode<unknown>, ParentNode>
> = (parent: ParentNode) => Promise<ChildNode[]>;

export interface ResponseFunction {
  name: string;
  description?: string;

  /** 
    The schema of the response. Includes the schema of the children.
    Can also include options like refinements, etc.
    */
  schema: z.ZodSchema;
}

export interface MakeGenerateChildrenWithOpenAiParams<
  ParentNode extends GenerationNode<unknown> | null,
  ChildNode extends WithParentNode<GenerationNode<unknown>, ParentNode>
> {
  /**
    Function that generates a prompt for a parent node.
    */
  makePromptMessages: (
    parentNode: ParentNode
  ) => Promise<OpenAI.ChatCompletionMessageParam[]>;
  openAiClient: OpenAI;
  clientConfig: Omit<
    OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
    "messages" | "tools" | "tool_choice"
  >;

  /**
    Information on what the elements of the response should look like.
   */
  response: ResponseFunction;

  /**
    Filter child nodes out of the response
   */
  filterNodes?: {
    filter: (node: ChildNode["data"]) => Promise<boolean>;
    /**
      @default 1
     */
    concurrency?: number;
  };
}

export function makeGenerateChildrenWithOpenAi<
  ParentNode extends GenerationNode<unknown> | null,
  ChildNode extends WithParentNode<GenerationNode<unknown>, ParentNode>
>({
  makePromptMessages,
  openAiClient,
  clientConfig,
  response,
  filterNodes,
}: MakeGenerateChildrenWithOpenAiParams<
  ParentNode,
  ChildNode
>): GenerateChildren<ParentNode, ChildNode> {
  return async function generateChildrenWithOpenAI(
    parent: ParentNode
  ): Promise<ChildNode[]> {
    const messages = await makePromptMessages(parent);

    const responseSchema = z.object({
      items: response.schema,
    });

    const completion = await getCompletions({
      openAiClient,
      clientConfig,
      messages,
      response: { ...response, schema: responseSchema },
      numCompletions: 1,
    });
    const children =
      completion.choices[0].message.tool_calls?.[0].function.arguments;

    if (!children) {
      throw new Error("No children returned from completion");
    }
    // Parse the response and extract the items array
    const parsedResponse = JSON.parse(children);
    const itemsArray = parsedResponse.items || parsedResponse;

    let { items: parsedChildren } = responseSchema.parse(itemsArray);
    if (!parsedChildren) {
      throw new Error("Failed to parse children");
    }

    parsedChildren = await filterChildNodes(filterNodes, parsedChildren);

    return makeChildrenNodes(parent, parsedChildren);
  };
}

export function makeGenerateNChoiceChildrenWithOpenAi<
  ParentNode extends GenerationNode<unknown> | null,
  ChildNode extends WithParentNode<GenerationNode<unknown>, ParentNode>
>({
  makePromptMessages,
  openAiClient,
  clientConfig,
  response,
  filterNodes,
  numCompletions,
}: Omit<
  MakeGenerateChildrenWithOpenAiParams<ParentNode, ChildNode>,
  "response"
> & {
  numCompletions?: number;
  response: ResponseFunction;
}): GenerateChildren<ParentNode, ChildNode> {
  return async function generateNChoiceChildrenWithOpenAI(
    parent: ParentNode
  ): Promise<ChildNode[]> {
    const messages = await makePromptMessages(parent);

    const completion = await getCompletions({
      openAiClient,
      clientConfig,
      messages,
      response,
      numCompletions,
    });

    let children: ChildNode["data"][] = completion.choices
      .map((choice) => choice.message.tool_calls?.[0].function.arguments)
      .filter((child): child is string => child !== undefined)
      .map((child) => response.schema.parse(JSON.parse(child)));

    if (children.length === 0) {
      throw new Error("No children returned from completion");
    }
    children = await filterChildNodes(filterNodes, children);
    return makeChildrenNodes(parent, children);
  };
}

async function getCompletions<
  ParentNode extends GenerationNode<unknown> | null,
  ChildNode extends WithParentNode<GenerationNode<unknown>, ParentNode>
>({
  openAiClient,
  clientConfig,
  messages,
  response,
  numCompletions,
}: Pick<
  MakeGenerateChildrenWithOpenAiParams<ParentNode, ChildNode>,
  "openAiClient" | "clientConfig"
> & {
  messages: OpenAI.ChatCompletionMessageParam[];
  numCompletions?: number;
  response: ResponseFunction;
}) {
  const completion = await openAiClient.chat.completions.create({
    ...clientConfig,
    messages,
    tool_choice: {
      type: "function",
      function: {
        name: response.name,
      },
    },
    n: numCompletions,
    tools: [
      {
        type: "function",
        function: {
          name: response.name,
          description: response.description,
          parameters: zodToJsonSchema(response.schema, {
            target: "openApi3",
          }),
          strict: true,
        },
      },
    ],
  });
  return completion;
}
async function filterChildNodes<
  ParentNode extends GenerationNode<unknown> | null,
  ChildNode extends WithParentNode<GenerationNode<unknown>, ParentNode>,
  C extends z.ZodTypeAny
>(
  filterNodes: MakeGenerateChildrenWithOpenAiParams<
    ParentNode,
    ChildNode
  >["filterNodes"],
  parsedChildren: z.infer<C>[]
): Promise<z.infer<C>[]> {
  if (filterNodes) {
    const { filter, concurrency = 1 } = filterNodes;
    const { results: filterResults } = await PromisePool.for(parsedChildren)
      .withConcurrency(concurrency)
      .process(async (data) => await filter(data));

    // Filter the original array based on the filter results
    parsedChildren = parsedChildren.filter((_, index) => filterResults[index]);
  }
  return parsedChildren;
}

function makeChildrenNodes<
  ParentNode extends GenerationNode<unknown> | null,
  ChildNode extends WithParentNode<GenerationNode<unknown>, ParentNode>
>(parent: ParentNode, children: ChildNode["data"][]): ChildNode[] {
  return children.map(
    (child) =>
      ({
        _id: new ObjectId(),
        parent,
        data: child,
        updated: new Date(),
      } as ChildNode)
  );
}
