import { strict as assert } from "assert";
import { Collection, BSON } from "mongodb-rag-core/mongodb";

export interface ExtractSampleDocumentsParams {
  collection: Collection;
  /**
    Number of documents to include in the sample.
   */
  limit?: number;
}
export const MUST_HAVE_AT_LEAST_ONE_EXAMPLE_DOCUMENT_ERROR =
  "Must have at least one example document";

/**
  Extract deterministic sample of documents for a given collection.
 */
export async function extractDeterministicSampleOfDocuments({
  collection,
  limit = 5,
}: ExtractSampleDocumentsParams) {
  const documents = await collection
    .aggregate([
      { $addFields: { hash: { $toHashedIndexKey: "$_id" } } },
      { $sort: { hash: 1 } },
      { $limit: limit },
    ])
    .toArray();
  assert(documents.length > 0, MUST_HAVE_AT_LEAST_ONE_EXAMPLE_DOCUMENT_ERROR);
  return documents;
}
