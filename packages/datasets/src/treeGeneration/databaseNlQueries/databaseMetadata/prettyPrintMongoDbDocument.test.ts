import { ObjectId, BSON } from "mongodb-rag-core/mongodb";
import { prettyPrintMongoDbDocument } from "./prettyPrintMongoDbDocument";

describe("prettyPrintMongoDbDocument", () => {
  it("should convert ObjectId to string representation", () => {
    // Arrange
    const objectId = new ObjectId("507f1f77bcf86cd799439011");
    const document = { _id: objectId, name: "test" };

    // Act
    const result = prettyPrintMongoDbDocument(document);

    // Assert
    expect(result).toContain('"$oid":"507f1f77bcf86cd799439011"');
    expect(result).toContain('"name":"test"');
    expect(result).not.toContain('"buffer"');
  });

  it("should handle nested ObjectIds", () => {
    // Arrange
    const objectId1 = new ObjectId("507f1f77bcf86cd799439011");
    const objectId2 = new ObjectId("507f1f77bcf86cd799439022");
    const document = {
      _id: objectId1,
      nested: {
        id: objectId2,
        name: "nested",
      },
      array: [objectId1, objectId2],
    };

    // Act
    const result = prettyPrintMongoDbDocument(document);

    // Assert
    expect(result).toContain('"$oid":"507f1f77bcf86cd799439011"');
    expect(result).toContain('"id":{"$oid":"507f1f77bcf86cd799439022"}');
    expect(result).not.toContain('"buffer"');
  });

  it("should handle other BSON types", () => {
    // Arrange
    const date = new Date("2023-01-01T00:00:00Z");
    const document = {
      _id: new ObjectId("507f1f77bcf86cd799439011"),
      date: date,
      decimal: new BSON.Decimal128("123.456"),
      binary: new BSON.Binary(Buffer.from("test")),
    };

    // Act
    const result = prettyPrintMongoDbDocument(document);

    // Assert
    expect(result).toContain('"$oid":"507f1f77bcf86cd799439011"');
    expect(result).toContain('"date":{"$date"');
    expect(result).toContain('"$numberDecimal":"123.456"');
    expect(result).toContain('"$binary"');
    expect(result).not.toContain('"buffer"');
  });

  it("should handle null and undefined values", () => {
    // Arrange
    const document = {
      _id: new ObjectId("507f1f77bcf86cd799439011"),
      nullValue: null,
      // MongoDB EJSON converts undefined to null
    };

    // Act
    const result = prettyPrintMongoDbDocument(document);

    // Assert
    expect(result).toContain('"$oid":"507f1f77bcf86cd799439011"');
    expect(result).toContain('"nullValue":null');
  });
});
