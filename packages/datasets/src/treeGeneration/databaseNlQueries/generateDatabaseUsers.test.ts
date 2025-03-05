import { ObjectId } from "mongodb-rag-core/mongodb";
import { generateDatabaseUsers } from "./generateDatabaseUsers";
import { DatabaseInfoNode, DatabaseInfoSchema } from "./nodeTypes";
import { sampleDatabaseUsers } from "./sampleData";

describe("generateDatabaseUsers", () => {
  jest.setTimeout(30000); // Increase timeout for OpenAI API calls

  it("should generate users for a movie database", async () => {
    // Validate the schema
    const validatedInfo = DatabaseInfoSchema.parse(sampleDatabaseUsers);

    // Create a parent node with the database info
    const parentNode: DatabaseInfoNode = {
      _id: new ObjectId(),
      parent: null,
      data: validatedInfo,
      updated: new Date(),
    };

    // Generate users for the movie database
    const users = await generateDatabaseUsers(parentNode);

    console.log(users.map((user) => user.data));
  });
});
