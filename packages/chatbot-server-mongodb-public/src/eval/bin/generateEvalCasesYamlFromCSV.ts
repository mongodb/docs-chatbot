/**
 # Generate Evaluation Cases YAML from CSV
 
 This script converts conversation evaluation cases from a CSV file to YAML format.
 It supports optional transformations of the evaluation cases during conversion.
 It also checks for missing resources in the database and logs them to the console.
 
 ## Usage
 
 Can be run through npm script or directly using node:
 
 ```bash
 npm run generate-eval-cases -- <csvFileName> <yamlFileName> [transformationType]
 ```
 
 Or:
 
 ```bash
 node generateEvalCasesYamlFromCSV.js <csvFileName> <yamlFileName> [transformationType]
 ```
 
 ### Arguments
 
 - `csvFilePath`: (Required) Absolute path to the input CSV file
 - `yamlFileName`: (Required) Name of the output YAML file (without .yml extension)
 - `transformationType`: (Optional) Type of transformation to apply to the cases
 
 ### Available Transformations
 
 - `web`: Adds a "web" tag to all evaluation cases
 
 ### File Paths
 
 - Output YAML files will be generated in: `evalCases/`
 
 ### Example
 
 ```bash
 npm run generate-eval-cases -- Users/first.lastname/Downloads/input-file.csv output-file-name web
 ```
 
 This will:
 1. Read from: /Users/first.lastname/Downloads/input-file.csv
 2. Apply the web transformation
 3. Write to: evalCases/output-file-name.yml
 4. Log missing resources to the console in a warning
*/

import fs from "fs";
import path from "path";
import yaml from "yaml";
import { MongoClient } from "mongodb";
import {
  getConversationEvalCasesFromCSV,
  ConversationEvalCase,
} from "mongodb-rag-core/eval";
import { MONGODB_CONNECTION_URI, MONGODB_DATABASE_NAME } from "../../config";

const SRC_ROOT = path.resolve(__dirname, "../");
const mongoClient = new MongoClient(MONGODB_CONNECTION_URI);
const db = mongoClient.db(MONGODB_DATABASE_NAME);

function addWebDataSourceTag(evalCases: ConversationEvalCase[]) {
  return evalCases.map((caseItem) => {
    const tags = caseItem.tags || [];
    if (!tags.includes("web")) {
      tags.push("web");
    }
    return {
      ...caseItem,
      tags,
    };
  });
}

const transformationMap: Record<
  string,
  (cases: ConversationEvalCase[]) => ConversationEvalCase[]
> = {
  web: addWebDataSourceTag,
  // Add more transformation functions here as needed
};

/**
 Normalizes a URL by removing the protocol (http/https) and 'www.' prefix
 normalizeUrl('https://www.example.com') // returns 'example.com'
 normalizeUrl('http://example.com') // returns 'example.com'
 */
function normalizeUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "");
}

const findMissingResources = async (
  expectedUrls: string[]
): Promise<string[]> => {
  const results = await Promise.all(
    expectedUrls.map(async (url) => {
      const pageExists = await db.collection("pages").findOne({
        url: { $regex: new RegExp(normalizeUrl(url)) },
      });
      return !pageExists ? url : null;
    })
  );
  return results.filter((url) => url !== null) as string[];
};

/**
 Main function to read CSV file, transform evaluation cases, and write to YAML file.
 @param csvFilePath - Path to the input CSV file
 @param yamlFileName - Name of the output YAML file
 @param transformationType - Type of transformation to apply (optional)
 */
async function main({
  csvFilePath,
  yamlFileName,
  transformationType,
}: {
  csvFilePath: string;
  yamlFileName: string;
  transformationType?: keyof typeof transformationMap;
}): Promise<void> {
  console.log(`Reading from: ${csvFilePath}`);
  const evalCases = await getConversationEvalCasesFromCSV(
    csvFilePath,
    transformationType ? transformationMap[transformationType] : undefined
  );
  const expectedSources = new Set<string>();
  evalCases.forEach((caseItem) => {
    caseItem.expectedLinks?.forEach((url) => {
      expectedSources.add(url);
    });
  });
  const urlList = Array.from(expectedSources);
  const urlsNotIngested = await findMissingResources(urlList);
  if (urlsNotIngested.length > 0) {
    console.warn(
      `Warning: ${urlsNotIngested.length}/${
        urlList.length
      } URLs are expected to be referenced by the chatbot, but have not been ingested:\n${urlsNotIngested
        .map((url) => `  - ${url}`)
        .join("\n")}`
    );
  }
  const yamlFilePath = path.join(
    SRC_ROOT,
    `../../evalCases/${yamlFileName}.yml`
  );
  console.log(`Writing to: ${yamlFilePath}`);
  const yamlContent = yaml.stringify(evalCases);
  await fs.promises.writeFile(yamlFilePath, yamlContent, "utf8");
  console.log("YAML file written successfully");
}

// Checks if the script is being run directly (not imported as a module) and handles command-line arguments.
if (require.main === module) {
  const args = process.argv.slice(2);
  const [csvFilePath, yamlFileName, transformationType] = args;
  const availableTransformationTypes = Object.keys(transformationMap);
  if (
    args.length < 2 ||
    (transformationType &&
      !availableTransformationTypes.includes(transformationType))
  ) {
    console.error(
      "Usage: node generateEvalCasesYamlFromCSV.js <csvFileName> <yamlFileName> [transformationType]\n" +
        "Arguments:\n" +
        "  csvFileName: Input CSV file name (required)\n" +
        "  yamlFileName: Output YAML file name (required)\n" +
        `  transformationType: Type of transformßation to apply (optional, one of: ${availableTransformationTypes.join(
          ", "
        )})\n` +
        "\nReceived args:",
      args
    );
    process.exit(1);
  }
  main({
    csvFilePath,
    yamlFileName,
    transformationType,
  })
    .catch((error) => {
      console.error("Error:", error);
      process.exit(1);
    })
    .finally(() => {
      mongoClient.close();
    });
}
