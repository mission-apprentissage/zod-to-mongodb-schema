import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import { zodToMongoSchema, zObjectId, zObjectIdMini } from "./index.ts";

describe("zodToMongoSchema", () => {
  it("should convert zod object properly", () => {
    expect(
      zodToMongoSchema(
        z
          .object({
            _id: zObjectId,
            string: z.string(),
            number: z.number(),
            enum: z.enum(["a", "b"]),
            optionalString: z.string().optional(),
            nullishNumber: z.number().nullish(),
            date: z.date(),
          })
          .strict(),
      ),
    ).toMatchSnapshot();
  });

  it("should resolves zod ref properly", () => {
    const zEmail = z.email();

    expect(
      zodToMongoSchema(
        z
          .object({
            _id: zObjectId,
            a: zEmail,
            b: zEmail,
          })
          .strict(),
      ),
    ).toMatchSnapshot();
  });

  it("should simplifies anyOf", () => {
    expect(zodToMongoSchema(z.string().nullable())).toMatchSnapshot();
  });

  it("should convert zod string regex with escape properly", () => {
    expect(
      zodToMongoSchema(
        z
          .object({
            _id: zObjectId,
            a: z.string().regex(/^\d+$/),
          })
          .strict(),
      ),
    ).toEqual({
      additionalProperties: false,
      bsonType: "object",
      properties: {
        _id: {
          bsonType: "objectId",
        },
        a: {
          bsonType: "string",
          pattern: "^\\d+$",
        },
      },
      required: ["_id", "a"],
    });
  });

  it("should convert zod string regex with escape properly", () => {
    expect(
      zodToMongoSchema(
        z
          .object({
            _id: zObjectId,
            datetime: z.iso.datetime(),
            date: z.date(),
          })
          .strict(),
      ),
    ).toEqual({
      additionalProperties: false,
      bsonType: "object",
      properties: {
        _id: {
          bsonType: "objectId",
        },
        datetime: {
          bsonType: "string",
          pattern:
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        },
        date: {
          bsonType: "date",
        },
      },
      required: ["_id", "datetime", "date"],
    });
  });

  it("should convert zod string regex with escape properly", () => {
    expect(
      zodToMongoSchema(
        z
          .object({
            _id: zObjectId,
            reason: z.literal("unsubscribe"),
          })
          .strict(),
      ),
    ).toEqual({
      additionalProperties: false,
      bsonType: "object",
      properties: {
        _id: {
          bsonType: "objectId",
        },
        reason: {
          bsonType: "string",
          enum: ["unsubscribe"],
        },
      },
      required: ["_id", "reason"],
    });
  });

  it("should support both zObjectId", () => {
    expect(
      zodToMongoSchema(
        z
          .object({
            _id: zObjectId,
            _mini: zObjectIdMini,
          })
          .strict(),
      ),
    ).toEqual({
      additionalProperties: false,
      bsonType: "object",
      properties: {
        _id: {
          bsonType: "objectId",
        },
        _mini: {
          bsonType: "objectId",
        },
      },
      required: ["_id", "_mini"],
    });
  });
});
