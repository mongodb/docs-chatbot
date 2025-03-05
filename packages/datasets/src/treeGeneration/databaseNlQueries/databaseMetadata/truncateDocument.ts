import { Document, ObjectId } from "mongodb-rag-core/mongodb";

export interface TruncationOptions {
  maxStringLength?: number;
  maxArrayLength?: number;
  maxObjectDepth?: number;
  maxObjectKeys?: number;
}

export const defaultTruncationOptions: TruncationOptions = {
  maxStringLength: 100,
  maxArrayLength: 3,
  maxObjectDepth: 3,
  maxObjectKeys: 20,
};

function truncateValue(
  value: any,
  options: TruncationOptions = defaultTruncationOptions,
  currentDepth = 0
): any {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle dates
  if (value instanceof Date) {
    return value;
  }
  if (value instanceof ObjectId) {
    return { $oid: value.toHexString() };
  }

  // Handle strings
  if (typeof value === "string" && options.maxStringLength) {
    return value.length > options.maxStringLength
      ? `${value.slice(0, options.maxStringLength)}...`
      : value;
  }

  // Handle arrays
  if (Array.isArray(value) && options.maxArrayLength) {
    const truncatedArray = value
      .slice(0, options.maxArrayLength)
      .map((item) => truncateValue(item, options, currentDepth + 1));
    if (value.length > options.maxArrayLength) {
      truncatedArray.push(
        `...and ${value.length - options.maxArrayLength} more items`
      );
    }
    return truncatedArray;
  }

  // Handle objects
  if (typeof value === "object") {
    // Stop at max depth
    if (currentDepth >= (options.maxObjectDepth ?? Infinity)) {
      return "[Object]";
    }

    const entries = Object.entries(value);
    const maxKeys = options.maxObjectKeys ?? Infinity;

    // Only truncate if we have more keys than the limit
    const keysToInclude = entries.length > maxKeys ? maxKeys : entries.length;

    // Truncate number of keys if needed
    const truncatedEntries = entries
      .slice(0, keysToInclude)
      .map(([key, val]) => [
        key,
        truncateValue(val, options, currentDepth + 1),
      ]);

    const result = Object.fromEntries(truncatedEntries);
    if (entries.length > maxKeys) {
      result["..."] = `${entries.length - maxKeys} more keys`;
    }
    return result;
  }

  // Return primitives as is
  return value;
}

/**
  Truncate long values in the document so that it fits within the context of the LLM.
  @param document The MongoDB document to truncate
  @param options Configuration for how to truncate different types of values
  @returns A new document with truncated values
 */
export function truncateDocumentForLlm(
  document: Document,
  options: TruncationOptions = defaultTruncationOptions
): Document {
  return truncateValue(document, options) as Document;
}
