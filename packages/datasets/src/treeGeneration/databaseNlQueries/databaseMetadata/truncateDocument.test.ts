import { Document } from "mongodb-rag-core/mongodb";
import { truncateDocumentForLlm, TruncationOptions } from "./truncateDocument";

describe("truncateDocumentForLlm", () => {
  describe("string truncation", () => {
    it("should truncate long strings", () => {
      const doc: Document = {
        title: "This is a very long string that should be truncated",
      };
      const options: TruncationOptions = { maxStringLength: 10 };
      const result = truncateDocumentForLlm(doc, options);
      expect(result.title).toBe("This is a ...");
    });

    it("should not truncate short strings", () => {
      const doc: Document = { title: "Short" };
      const options: TruncationOptions = { maxStringLength: 10 };
      const result = truncateDocumentForLlm(doc, options);
      expect(result.title).toBe("Short");
    });
  });

  describe("array truncation", () => {
    it("should truncate long arrays", () => {
      const doc: Document = {
        tags: ["one", "two", "three", "four", "five"],
      };
      const options: TruncationOptions = { maxArrayLength: 2 };
      const result = truncateDocumentForLlm(doc, options);
      expect(result.tags).toHaveLength(3); // 2 items + message
      expect(result.tags[2]).toBe("...and 3 more items");
    });

    it("should not truncate short arrays", () => {
      const doc: Document = { tags: ["one", "two"] };
      const options: TruncationOptions = { maxArrayLength: 3 };
      const result = truncateDocumentForLlm(doc, options);
      expect(result.tags).toEqual(["one", "two"]);
    });

    it("should handle nested arrays", () => {
      const doc: Document = {
        matrix: [
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          [9, 10, 11, 12],
        ],
      };
      const options: TruncationOptions = {
        maxArrayLength: 2,
      };
      const result = truncateDocumentForLlm(doc, options);
      expect(result.matrix).toHaveLength(3); // 2 arrays + message
      expect(result.matrix[0]).toHaveLength(3); // 2 numbers + message
      expect(result.matrix[2]).toBe("...and 1 more items");
    });
  });

  describe("object truncation", () => {
    it("should truncate objects with many keys", () => {
      const doc: Document = {
        key1: "value1",
        key2: "value2",
        key3: "value3",
        key4: "value4",
      };
      const options: TruncationOptions = { maxObjectKeys: 2 };
      const result = truncateDocumentForLlm(doc, options);
      expect(Object.keys(result)).toHaveLength(3); // 2 keys + "..."
      expect(result["..."]).toBe("2 more keys");
    });

    it("should respect max depth for nested objects", () => {
      const doc: Document = {
        level1: {
          level2: {
            level3: {
              level4: "deep value",
            },
          },
        },
      };
      const options: TruncationOptions = { maxObjectDepth: 2 };
      const result = truncateDocumentForLlm(doc, options);
      expect(result.level1.level2).toBe("[Object]");
    });
  });

  describe("mixed type handling", () => {
    it("should handle complex nested structures", () => {
      const doc: Document = {
        title: "A very long title that needs truncation",
        tags: ["tag1", "tag2", "tag3", "tag4"],
        metadata: {
          created: new Date("2025-01-01"),
          author: {
            name: "John Doe",
            favorites: ["one", "two", "three", "four"],
          },
        },
      };
      const options: TruncationOptions = {
        maxStringLength: 15,
        maxArrayLength: 2,
        maxObjectDepth: 2,
        maxObjectKeys: 3,
      };
      const result = truncateDocumentForLlm(doc, options);

      // Check string truncation
      expect(result.title).toBe("A very long tit...");

      // Check array truncation
      expect(result.tags).toHaveLength(3);
      expect(result.tags[2]).toBe("...and 2 more items");

      // Check object depth truncation
      expect(result.metadata).toEqual({
        created: new Date("2025-01-01"),
        author: "[Object]",
      });

      // Check object keys truncation - should have title, tags, metadata
      const keys = Object.keys(result).sort();
      expect(keys).toEqual(["metadata", "tags", "title"]);
    });
  });

  describe("special cases", () => {
    it("should handle null and undefined values", () => {
      const doc: Document = {
        nullField: null,
        undefinedField: undefined,
      };
      const result = truncateDocumentForLlm(doc);
      expect(result.nullField).toBeNull();
      expect(result.undefinedField).toBeUndefined();
    });

    it("should handle empty arrays and objects", () => {
      const doc: Document = {
        emptyArray: [],
        emptyObject: {},
      };
      const result = truncateDocumentForLlm(doc);
      expect(result.emptyArray).toEqual([]);
      expect(result.emptyObject).toEqual({});
    });

    it("should handle Date objects", () => {
      const date = new Date("2025-01-01");
      const doc: Document = { date };
      const result = truncateDocumentForLlm(doc);
      expect(result.date).toEqual(date);
    });
  });

  describe("default options", () => {
    it("should use default options when none provided", () => {
      const doc: Document = {
        longString: "x".repeat(200),
        longArray: Array.from({ length: 10 }, (_, i) => i),
      };
      const result = truncateDocumentForLlm(doc);
      expect(result.longString.length).toBe(103); // 100 chars + "..."
      expect(result.longArray).toHaveLength(4); // 3 items + message
    });
  });
});
