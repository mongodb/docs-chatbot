import { PromisePool } from "@supercharge/promise-pool";
import {
  makePageParser,
  makeExtractCodeBlocksWithHeadings,
} from "./extractPageElements";
import {
  CodeExampleDatasetEntry,
  makeCreateCodeExampleDatasetEntry,
} from "./createCodeExampleDatasetEntry";
import { OpenAI } from "mongodb-rag-core/openai";
import { Page, PersistedPage, TransformPage } from "mongodb-rag-core";

export async function makeTranformPageToAnnotatedCodeExamples(
  openAiClient: OpenAI,
  model: string,
  codeBlockProcessingConcurrency: number
): Promise<TransformPage<CodeExampleDatasetEntry>> {
  // Construct data processors
  const pageParser = await makePageParser();
  const extractCodeBlocksWithHeadings =
    await makeExtractCodeBlocksWithHeadings();
  const createCodeExampleDatasetEntry = await makeCreateCodeExampleDatasetEntry(
    {
      openAiClient,
      model,
    }
  );

  return async function transformPageToAnnotatedCodeExamples(page: Page) {
    const ast = pageParser.parse(page.body);
    const pageCodeBlocks = extractCodeBlocksWithHeadings({ page, ast });

    const { results: codeBlockDatasetEntries } =
      await PromisePool.withConcurrency(codeBlockProcessingConcurrency)
        .for(pageCodeBlocks)
        .process(async (codeBlock) => {
          const codeExampleDatasetEntry = await createCodeExampleDatasetEntry({
            page,
            codeBlock,
          });
          return codeExampleDatasetEntry;
        });

    return codeBlockDatasetEntries;
  };
}
