import { ObjectId } from "mongodb-rag-core/mongodb";

import { generateDatabaseUseCases } from "./generateUseCases";
import {
  DatabaseInfoSchema,
  DatabaseUserNode,
  DatabaseInfoNode,
} from "./nodeTypes";
import { sampleMovieDbInfo, sampleDatabaseUsers } from "./sampleData";

describe("generateDatabaseUseCases", () => {
  jest.setTimeout(300000); // Increase timeout for OpenAI API calls

  it("should generate use cases for a database user", async () => {
    // Validate the schemas
    const validatedInfo = DatabaseInfoSchema.parse(sampleMovieDbInfo);

    // Create a parent node with the database info
    const databaseInfoNode: DatabaseInfoNode = {
      _id: new ObjectId(),
      parent: null,
      data: validatedInfo,
      updated: new Date(),
    };

    // Create a user node with the parent reference
    const userNodes: DatabaseUserNode[] = sampleDatabaseUsers.map((user) => ({
      _id: new ObjectId(),
      parent: databaseInfoNode,
      data: user,
      updated: new Date(),
    }));

    for (const userNode of userNodes) {
      const useCases = await generateDatabaseUseCases(userNode);
      console.log("Use cases for user:", userNode.data.name);
      console.log(
        JSON.stringify(
          useCases.map((useCase) => useCase.data),
          null,
          2
        )
      );
    }
  });
});
