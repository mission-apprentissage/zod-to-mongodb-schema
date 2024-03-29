import {
  JSONSchema7,
  JSONSchema7Definition,
  JSONSchema7Type,
  JSONSchema7TypeName,
} from "json-schema";
import { ObjectId } from "bson";
import { ZodType, z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

type MongoType = "object" | "array" | "number" | "boolean" | "string" | "null";
type MongoBsonType =
  | "double"
  | "string"
  | "object"
  | "array"
  | "binData"
  | "objectId"
  | "bool"
  | "date"
  | "null"
  | "regex"
  | "javascript"
  | "int"
  | "timestamp"
  | "long"
  | "decimal"
  | "minKey"
  | "maxKey"
  | "number";

// https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/#available-keywords

export interface MongoSchema {
  additionalItems?: boolean | MongoSchema;
  additionalProperties?: boolean | MongoSchema;
  allOf?: MongoSchema[];
  anyOf?: MongoSchema[];
  bsonType?: MongoBsonType | MongoBsonType[];
  dependencies?: {
    [k: string]: string[] | MongoSchema;
  };
  description?: string;
  enum?: JSONSchema7Type[];
  exclusiveMaximum?: boolean;
  exclusiveMinimum?: boolean;
  items?: MongoSchema | MongoSchema[];
  maximum?: number;
  maxItems?: number;
  maxLength?: number;
  maxProperties?: number;
  minimum?: number;
  minItems?: number;
  minLength?: number;
  minProperties?: number;
  multipleOf?: number;
  not?: MongoSchema;
  oneOf?: MongoSchema[];
  pattern?: string;
  patternProperties?: {
    [reg: string]: MongoSchema;
  };
  properties?: {
    [key: string]: MongoSchema;
  };
  required?: string[];
  title?: string;
  type?: MongoType | MongoType[];
  uniqueItems?: boolean;
}

function convertJSONSchema7Definition(
  root: JSONSchema7,
  input: JSONSchema7Definition,
): MongoSchema | boolean {
  if (typeof input === "boolean") {
    return input;
  }

  return jsonSchemaToMongoSchema(root, input);
}

function convertJSONSchema7DefinitionNoBoolean(
  root: JSONSchema7,
  input: JSONSchema7Definition,
): MongoSchema {
  if (typeof input === "boolean") {
    throw new Error("Boolean not supported");
  }

  return jsonSchemaToMongoSchema(root, input);
}

function convertTypeToBsonType(type: JSONSchema7TypeName): MongoBsonType {
  switch (type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "integer":
      return "int";
    case "boolean":
      return "bool";
    case "object":
      return "object";
    case "array":
      return "array";
    case "null":
      return "null";
  }
}

export const zObjectId = z
  .custom<ObjectId | string>((v) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ObjectId.isValid(v as any);
  })
  .transform((v) => new ObjectId(v))
  .describe("Identifiant unique");

function resolveRef(root: JSONSchema7, ref: string) {
  const result: MongoSchema = {};

  if (ref === "#/definitions/objectId") {
    result.bsonType = "objectId";
    return result;
  }
  const parts: string[] = ref.split("/").slice(1);
  const schema = parts.reduce((acc, part) => {
    if (!(part in acc)) {
      throw new Error(`Cannot resolve reference ${ref}`);
    }
    // @ts-expect-error parts are not properly typed
    return acc[part] as JSONSchema7;
  }, root);

  return jsonSchemaToMongoSchema(root, schema);
}

/**
 * Conversion du schema pour le format mongoDB
 */
export const jsonSchemaToMongoSchema = (
  root: JSONSchema7,
  schema: JSONSchema7,
): MongoSchema => {
  let result: MongoSchema = {};

  if (schema.additionalItems != null) {
    result.additionalItems = convertJSONSchema7Definition(
      root,
      schema.additionalItems,
    );
  }

  if (schema.additionalProperties != null) {
    if (typeof schema.additionalProperties === "boolean") {
      result.additionalProperties = schema.additionalProperties;
    } else if (Object.keys(schema.additionalProperties).length === 0) {
      result.additionalProperties = true;
    } else {
      result.additionalProperties = convertJSONSchema7Definition(
        root,
        schema.additionalProperties,
      );
    }
  }

  if (schema.allOf) {
    result.allOf = schema.allOf.map((s) =>
      convertJSONSchema7DefinitionNoBoolean(root, s),
    );
  }

  if (schema.anyOf) {
    result.anyOf = schema.anyOf.map((s) =>
      convertJSONSchema7DefinitionNoBoolean(root, s),
    );
  }

  if (schema.dependencies) {
    result.dependencies = Object.entries(schema.dependencies).reduce(
      (acc: NonNullable<MongoSchema["dependencies"]>, [k, v]) => {
        acc[k] = Array.isArray(v)
          ? v
          : convertJSONSchema7DefinitionNoBoolean(root, v);
        return acc;
      },
      {},
    );
  }

  if (schema.description != null) result.description = schema.description;
  if (schema.enum != null) result.enum = schema.enum;
  if (schema.exclusiveMaximum != null) {
    result.exclusiveMaximum = true;
    result.maximum = schema.exclusiveMaximum;
  }
  if (schema.exclusiveMinimum != null) {
    result.exclusiveMinimum = true;
    result.minimum = schema.exclusiveMinimum;
  }
  if (schema.items != null) {
    result.items = Array.isArray(schema.items)
      ? schema.items.map((s) => convertJSONSchema7DefinitionNoBoolean(root, s))
      : convertJSONSchema7DefinitionNoBoolean(root, schema.items);
  }
  if (schema.maximum != null) result.maximum = schema.maximum;
  if (schema.maxItems != null) result.maxItems = schema.maxItems;
  if (schema.maxLength != null) result.maxLength = schema.maxLength;
  if (schema.maxProperties != null) result.maxProperties = schema.maxProperties;
  if (schema.minimum != null) result.minimum = schema.minimum;
  if (schema.minItems != null) result.minItems = schema.minItems;
  if (schema.minLength != null) result.minLength = schema.minLength;
  if (schema.minProperties != null) result.minProperties = schema.minProperties;
  if (schema.multipleOf != null) result.multipleOf = schema.multipleOf;
  if (schema.not != null)
    result.not = convertJSONSchema7DefinitionNoBoolean(root, schema.not);
  if (schema.oneOf != null)
    result.oneOf = schema.oneOf.map((s) =>
      convertJSONSchema7DefinitionNoBoolean(root, s),
    );
  if (schema.pattern != null) result.pattern = schema.pattern;
  if (schema.patternProperties != null) {
    result.patternProperties = Object.entries(schema.patternProperties).reduce(
      (acc: NonNullable<MongoSchema["patternProperties"]>, [k, v]) => {
        acc[k] = convertJSONSchema7DefinitionNoBoolean(root, v);
        return acc;
      },
      {},
    );
  }
  if (schema.properties != null) {
    result.properties = Object.entries(schema.properties).reduce(
      (acc: NonNullable<MongoSchema["properties"]>, [k, v]) => {
        acc[k] = convertJSONSchema7DefinitionNoBoolean(root, v);
        return acc;
      },
      {},
    );
  }
  if (schema.required != null) result.required = schema.required;
  if (schema.title != null) result.title = schema.title;
  if (schema.type != null) {
    result.bsonType = Array.isArray(schema.type)
      ? schema.type.map(convertTypeToBsonType)
      : convertTypeToBsonType(schema.type);
  }
  if (schema.uniqueItems != null) result.uniqueItems = schema.uniqueItems;

  if (schema.format === "date-time") {
    delete result.type;
    result.bsonType = "date";
  }

  if (schema.$ref) {
    result = { ...result, ...resolveRef(root, schema.$ref) };
  }

  return result;
};

export function zodToMongoSchema(input: ZodType): MongoSchema {
  const jsonSchema = zodToJsonSchema(input, {
    definitions: {
      objectId: zObjectId,
    },
  }) as JSONSchema7;

  return jsonSchemaToMongoSchema(jsonSchema, jsonSchema);
}
