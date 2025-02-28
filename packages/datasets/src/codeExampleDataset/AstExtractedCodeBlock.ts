import { Code } from "mdast";
export interface AstExtractedCodeblock {
  code: string;
  programmingLanguage: string | null;
  metadata: {
    pageUrl: string;
    sourceName: string;
    tags?: string[];
    pageTitle?: string;
    mdastNode?: Code;
    parentHeadings?: {
      h1?: string;
      h2?: string;
      h3?: string;
      h4?: string;
      h5?: string;
      h6?: string;
    };
  };
}

export type AugmentedAstExtractedCodeblock = AstExtractedCodeblock & {
  prompts: string[];
  classification: string;
};

export interface CodeExampleUtility {
  isUseful: boolean;
  usefulnessReasoning: string;
}
export type AugmentedAstExtractedCodeblockWithUtility =
  AugmentedAstExtractedCodeblock & CodeExampleUtility;
