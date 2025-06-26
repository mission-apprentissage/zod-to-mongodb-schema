import { ObjectId } from "bson";
import type { $ZodType, JSONSchema } from "zod/v4/core";
import { custom, pipe, transform, toJSONSchema, registry } from "zod/v4-mini";

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
  enum?: Array<
    | string
    | number
    | boolean
    | JSONSchema.ObjectSchema
    | JSONSchema.ArraySchema
    | null
  >;
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
  root: JSONSchema.Schema,
  input: JSONSchema._JSONSchema,
): MongoSchema | boolean {
  if (typeof input === "boolean") {
    return input;
  }

  return jsonSchemaToMongoSchema(root, input);
}

function convertJSONSchema7DefinitionNoBoolean(
  root: JSONSchema.Schema,
  input: JSONSchema._JSONSchema,
): MongoSchema {
  if (typeof input === "boolean") {
    throw new Error("Boolean not supported");
  }

  return jsonSchemaToMongoSchema(root, input);
}

function convertTypeToBsonType(
  type:
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "object"
    | "array"
    | "null",
): MongoBsonType {
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

export const zObjectId = pipe(
  custom<ObjectId | string>((v) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ObjectId.isValid(v as any);
  }),
  transform((v) => new ObjectId(v)),
);

function resolveRef(root: JSONSchema.Schema, ref: string) {
  const result: MongoSchema = {};

  if (ref === "objectId") {
    result.bsonType = "objectId";
    return result;
  }
  const parts: string[] = ref.split("/").slice(1);
  const schema = parts.reduce((acc, part) => {
    if (!(part in acc)) {
      throw new Error(`Cannot resolve reference ${ref}`);
    }
    return acc[part] as JSONSchema.Schema;
  }, root);

  return jsonSchemaToMongoSchema(root, schema);
}

function simplifyAnyOf(schema: MongoSchema): MongoSchema {
  const { anyOf = null } = schema;
  if (anyOf == null) {
    return schema;
  }

  const keys = Object.keys(schema);
  if (keys.length > 1) {
    return schema;
  }

  if (anyOf.length === 1) {
    return anyOf[0]!;
  }

  if (anyOf.every((s) => s.bsonType && Object.keys(s).length === 1)) {
    return {
      bsonType: Array.from(new Set(anyOf.flatMap((s) => s.bsonType!))),
    };
  }

  return schema;
}

/**
 * Conversion du schema pour le format mongoDB
 */
export const jsonSchemaToMongoSchema = (
  root: JSONSchema.Schema,
  schema: JSONSchema.Schema,
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

  return simplifyAnyOf(result);
};

export function zodToMongoSchema(input: $ZodType): MongoSchema {
  const metadata = registry<{ id: string; description?: string }>();
  metadata.add(zObjectId, {
    id: "objectId",
    description: "Identifiant unique",
  });
  metadata.add(input, { id: "root" });

  const { schemas: jsonSchemas } = toJSONSchema(metadata, {
    target: "draft-7",
    unrepresentable: "any",
    override: (ctx) => {
      if (ctx.zodSchema._zod.def.type === "date") {
        ctx.jsonSchema.type = "string";
        ctx.jsonSchema.format = "date-time";
      }
    },
  });

  return jsonSchemaToMongoSchema(jsonSchemas["root"]!, jsonSchemas["root"]!);
}
