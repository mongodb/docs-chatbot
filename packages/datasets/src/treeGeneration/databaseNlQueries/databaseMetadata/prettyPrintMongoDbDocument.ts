import { BSON } from "mongodb-rag-core/mongodb";

/**
  Converts MongoDB documents with BSON types to a readable string format using EJSON.
 */
export function prettyPrintMongoDbDocument(document: unknown): string {
  return BSON.EJSON.stringify(document, {
    relaxed: true,
  });
}
