import "dotenv/config";
import { makeCreatePromptsFromText } from "./createPromptsFromText.js";
import { PersistedPage } from "mongodb-rag-core";
import {
  AstExtractedCodeblock,
  AugmentedAstExtractedCodeblock,
} from "./AstExtractedCodeBlock.js";
import { makeClassifyCodeExample } from "./classifyCodeExample.js";
import { contextualizeCodeBlock } from "./contextualizeCodeBlock.js";
import { OpenAI } from "mongodb-rag-core/openai";

export async function appendLlmMetadata({
  pages,
  codeExamples,
  batchSize = 5,
  openAiClient,
  model,
}: {
  pages: PersistedPage[];
  codeExamples: AstExtractedCodeblock[];
  batchSize?: number;
  openAiClient: OpenAI;
  model: string;
}): Promise<AugmentedAstExtractedCodeblock[]> {
  const pagesMap: { [url: string]: PersistedPage } = {};
  for (const page of pages) {
    pagesMap[page.url] = page;
  }

  const createQuestionsFromText = makeCreatePromptsFromText({
    openAiClient,
    model,
  });
  const classifyCodeExample = makeClassifyCodeExample({
    openAiClient,
    model,
  });

  const codeBlocksWithPrompts: AugmentedAstExtractedCodeblock[] = [];

  for (let i = 0; i < codeExamples.length; i += batchSize) {
    console.log(
      `Processing codeblocks indexes ${i} to ${i + batchSize - 1} of ${
        codeExamples.length
      } total...`
    );
    const batchPromises = codeExamples
      .slice(i, i + batchSize)
      .map(async (codeblock) => {
        const page = pagesMap[codeblock.metadata.pageUrl];
        const text = contextualizeCodeBlock({
          codeblock,
          page,
        });
        const [prompts, classification] = await Promise.all([
          createQuestionsFromText({ text }),
          classifyCodeExample({ text }),
        ]);

        return {
          ...codeblock,
          prompts,
          classification,
        } satisfies AugmentedAstExtractedCodeblock;
      });

    const results = await Promise.allSettled(batchPromises);
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        codeBlocksWithPrompts.push(result.value);
      } else {
        console.error("Failed to process codeblock:", result.reason);
      }
    });
  }
  return codeBlocksWithPrompts;
}
