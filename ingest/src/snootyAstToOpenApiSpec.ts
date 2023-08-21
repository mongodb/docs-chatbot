import yaml from "yaml";
import { SnootyNode } from "./SnootyDataSource";

export const snootyAstToOpenApiSpec = async (
  node: SnootyNode
): Promise<string> => {
  if (node.name === "openapi") {
    if (
      node.children &&
      node.children.length > 0 &&
      node.children[0].type === "text"
    ) {
      const jsonSpecString = node.children[0].value as string;
      const text = yaml.stringify(JSON.parse(jsonSpecString));
      return cleanSpec(text);
      // Have to hard code how the Atlas OpenAPI spec is loaded for now.
      // There is no programmatic way to get the spec resource from the Snooty AST.
    } else if (node?.options?.source_type === "atlas") {
      console.log("Fetching Atlas OpenAPI spec");
      const version = node?.options?.["api-version"] || "2.0";
      const data = await fetch(
        "https://cloud.mongodb.com/api/openapi/spec/" + version
      );
      const json = await data.json();
      const text = yaml.stringify(json);
      const cleanedSpec = cleanSpec(text);
      return cleanedSpec;
    } else {
      return "";
    }
  }
  const promises = node.children?.map(async (childNode) =>
    snootyAstToOpenApiSpec(childNode)
  ) || [new Promise(() => "")];
  return (await Promise.all(promises)).join("") || "";
};

function cleanSpec(spec: string): string {
  return spec
    .replaceAll("\n\n", "\n") // remove unnecessary double newlines
    .replaceAll(/\[([^[\]]+?)\]\(.*?\)/g, (_, text) => text); // replace markdown links with just the text
}

export const getTitleFromSnootyOpenApiSpecAst = (
  node: SnootyNode
): string | undefined => {
  if (node.options?.template === "openapi") {
    return node.options?.title as string;
  }
  return (
    node.children
      ?.map((childNode) => snootyAstToOpenApiSpec(childNode))
      .join("") || ""
  );
};
