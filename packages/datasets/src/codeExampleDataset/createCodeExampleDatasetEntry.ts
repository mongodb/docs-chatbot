import { OpenAI } from "mongodb-rag-core/openai";
import langMap from "lang-map";
import {
  ClassificationType,
  makeClassifyCodeExample,
} from "./classifyCodeExample";
import { AstExtractedCodeblock } from "./AstExtractedCodeBlock";
import { makeClassifyIsUsefulCodeBlockForTraining } from "./classifyIsUsefulCodeBlockForTraining";
import { makeCreatePromptsFromText } from "./createPromptsFromText";
import { Page } from "mongodb-rag-core";

export interface CodeExampleDatasetEntry {
  /**
    Code example.
   */
  text: string;

  /**
    Programming language of the code snippet. Programming language name in [Github Linguist list](https://github.com/github-linguist/linguist/blob/main/lib/linguist/languages.yml).
   */
  programming_language?: string;

  /**
    URL of page that the code example came from.
   */
  url: string;

  updated: Date;

  sourceName: string;

  /**
    Title of the page that the code example came from.
   */
  page_title?: string;

  /**
    Natural language prompts that coudl be used to generate the code example.
   */
  prompts: string[];

  /**
    Tags for the code example
   */
  tags?: string[];

  /**
    Classification type of the code example. 
   */
  classification: ClassificationType["type"];

  /**
    Whether the code example should be used for training an LLM,
    as determined by an LLM classifier.
   */
  useful_for_training?: boolean;

  /**
    Chain-of-thought reasoning for why the code example should be used for training an LLM.
   */
  utility_reasoning?: string;
}

export interface MakeCodeExampleDatasetEntryParams {
  openAiClient: OpenAI;
  model: string;
  numPrompts?: number;
}

export async function makeCreateCodeExampleDatasetEntry({
  openAiClient,
  model,
  numPrompts = 3,
}: MakeCodeExampleDatasetEntryParams) {
  const classifyCodeExampleType = makeClassifyCodeExample({
    openAiClient,
    model,
  });
  const classifyIsUsefulCodeBlockForTraining =
    makeClassifyIsUsefulCodeBlockForTraining({
      openAiClient,
      model,
    });

  const createPrompts = makeCreatePromptsFromText({
    openAiClient,
    model,
  });

  return async function createCodeExampleDatasetEntry({
    page,
    codeBlock,
  }: {
    page: Page;
    codeBlock: AstExtractedCodeblock;
  }): Promise<CodeExampleDatasetEntry> {
    // Concurrent LLM API calls
    const [classification, prompts] = await Promise.all([
      classifyCodeExampleType({
        text: codeBlock.code,
      }),
      createPrompts({
        text: codeBlock.code,
        numQuestions: numPrompts,
      }),
    ]);

    const { isUseful, usefulnessReasoning } =
      await classifyIsUsefulCodeBlockForTraining({
        codeExample: { ...codeBlock, prompts, classification },
      });

    const programming_language = codeBlock.programmingLanguage?.trim()
      ? normalizeProgrammingLanguageName(codeBlock.programmingLanguage.trim())
      : undefined;

    return {
      text: codeBlock.code,
      programming_language,
      url: page.url,
      updated: new Date(),
      sourceName: page.sourceName,
      page_title: page.title,
      classification,
      useful_for_training: isUseful,
      utility_reasoning: usefulnessReasoning,
      prompts,
      tags: codeBlock.metadata.tags,
    };
  };
}

/**
  Returns the normalized programming language name. If one doesn't exist, returns the input language name.
  @example 
  ```
  "js" -> "javascript" // "js" is a valid Github Linguist language name
  "python" -> "python" // "python" is a valid Github Linguist language name
  "dsgasfdh" -> "dsgasfdh" // "dsgasfdh" is not a valid Github Linguist language name. Passes through.
  ```
 */
export function normalizeProgrammingLanguageName(language: string): string {
  return langMap.languages(language.trim().toLowerCase())[0];
}
