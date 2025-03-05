import "dotenv/config";
import { ObjectId } from "mongodb-rag-core/mongodb";
import * as fs from "fs";
import * as path from "path";
import PromisePool from "@supercharge/promise-pool";
import { generateDatabaseUsers } from "./generateDatabaseUsers";
import { generateDatabaseUseCases } from "./generateUseCases";
import { generateNaturalLanguageQueries } from "./generateNaturalLanguageQueries";
import { DatabaseInfoNode } from "./nodeTypes";
import { sampleMovieDbInfo } from "./sampleData";

describe("End-to-end NL query generation pipeline", () => {
  jest.setTimeout(600000000); // 10 minutes timeout for the entire pipeline

  it("should generate database users, use cases, and NL queries", async () => {
    // Step 1: Create the database info node
    const databaseInfoNode: DatabaseInfoNode = {
      _id: new ObjectId(),
      parent: null,
      data: sampleMovieDbInfo,
      updated: new Date(),
    };

    // Step 2: Generate database users
    console.log("Generating database users...");
    const userNodes = await generateDatabaseUsers(databaseInfoNode);
    console.log(`Generated ${userNodes.length} database users`);

    // Step 3: Generate use cases for each user
    console.log("Generating use cases for each user...");
    const { results: useCaseNodesByUser } = await PromisePool.for(userNodes)
      .withConcurrency(3)
      .process(async (userNode) => {
        const useCases = await generateDatabaseUseCases(userNode);
        console.log(
          `Generated ${useCases.length} use cases for ${userNode.data.name}`
        );
        return useCases;
      });

    const useCaseNodes = useCaseNodesByUser.flat();

    const allNodes: unknown[] = [];
    // Step 4: Generate NL queries for each use case
    console.log("Generating natural language queries for each use case...");

    // Step 5: Write all nodes to a JSONL file
    const outputPath = path.resolve(__dirname, "nl_queries.jsonl");

    // Clear the file if it exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    // Process use cases in parallel with limited concurrency
    await PromisePool.withConcurrency(3)
      .for(useCaseNodes)
      .process(async (useCaseNode) => {
        try {
          const nlQueries = await generateNaturalLanguageQueries(useCaseNode);
          console.log(
            `Generated ${nlQueries.length} NL queries for use case: ${useCaseNode.data.title}`
          );

          // Add NL query nodes to the collection
          nlQueries.forEach((node) => {
            allNodes.push({
              type: "natural_language_query",
              _id: node._id.toString(),
              parent: node.parent._id.toString(),
              data: node.data,
              updated: node.updated,
            });
          });
          // Write each node as a separate line in JSONL format
          allNodes.forEach((node) => {
            fs.appendFileSync(outputPath, JSON.stringify(node) + "\n");
          });
        } catch (error) {
          console.error(
            `Error generating NL queries for use case ${useCaseNode.data.title}:`,
            error
          );
        }
      });

    console.log(`Successfully wrote ${allNodes.length} nodes to ${outputPath}`);

    // Basic assertions
    expect(userNodes.length).toBeGreaterThan(0);
    expect(useCaseNodes.length).toBeGreaterThan(0);
    expect(allNodes.length).toBeGreaterThan(0);
  });
});
