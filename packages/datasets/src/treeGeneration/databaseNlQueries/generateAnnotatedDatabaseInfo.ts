import { MongoClient, ObjectId } from "mongodb-rag-core/mongodb";
import { DatabaseInfo, DatabaseInfoNode } from "./nodeTypes";
import { getDatabaseMetadata } from "./databaseMetadata/getDatabaseMetadata";
import { LlmOptions } from "./databaseMetadata/LlmOptions";
import { generateHighLevelDbDescriptions } from "./databaseMetadata/generateHighLevelDbDescriptions";
import { generateAnnotatedCollectionSchema } from "./databaseMetadata/generateAnnotatedCollectionSchema";

interface GenerateAnnotatedDatabaseInfoParams {
  mongoDb: {
    mongoClient: MongoClient;
    databaseName: string;
    numSamplesPerCollection?: number;
  };
  latestDate?: Date;
  llm: LlmOptions;
}

export async function generateAnnotatedDatabaseInfo({
  mongoDb: { mongoClient, databaseName, numSamplesPerCollection = 2 },
  latestDate = new Date(),
  llm,
}: GenerateAnnotatedDatabaseInfoParams): Promise<DatabaseInfoNode> {
  // Get raw database metadata
  const databaseMetadata = await getDatabaseMetadata({
    mongoClient,
    databaseName,
    numSamplesPerCollection,
    latestDate,
  });

  // Generate high-level database descriptions
  const highLevelDescriptions = await generateHighLevelDbDescriptions(
    databaseMetadata,
    llm
  );

  // Create initial annotated database info
  const annotatedDatabaseInfo: DatabaseInfo = {
    name: databaseName,
    description: highLevelDescriptions.databaseDescription,
    latestDate,
    collections: databaseMetadata.collections.map((collection, i) => ({
      name: collection.collectionName,
      description: highLevelDescriptions.collectionDescriptions[i].description,
      schema: collection.schema,
      examples: collection.exampleDocuments,
      indexes: collection.indexes,
    })),
  };

  // Generate detailed schema descriptions for each collection
  for (let i = 0; i < annotatedDatabaseInfo.collections.length; i++) {
    const annotatedCollection = annotatedDatabaseInfo.collections[i];
    const collection = databaseMetadata.collections.find(
      (c) => c.collectionName === annotatedCollection.name
    );
    if (!collection) {
      continue;
    }

    const { typeScriptSchema, indexDescriptions } =
      await generateAnnotatedCollectionSchema({
        collectionMetadata: collection,
        databaseMetadata,
        llm,
      });

    // Update the collection's schema with the annotated version
    annotatedCollection.schema = typeScriptSchema;

    // Update the collection's indexes with the annotated version
    for (let j = 0; j < indexDescriptions.length; j++) {
      const indexDescription = indexDescriptions[j];

      const collectionIndexDescription = annotatedCollection.indexes.find(
        (index) => index.name === indexDescription.name
      );

      if (!collectionIndexDescription) {
        continue;
      }

      collectionIndexDescription.description = indexDescription.description;
    }
  }

  // Return the final DatabaseInfoNode
  return {
    _id: new ObjectId(),
    parent: null,
    data: annotatedDatabaseInfo,
    updated: new Date(),
  };
}
