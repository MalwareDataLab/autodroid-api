import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsHash,
  IsLocale,
  IsMimeType,
  IsNotEmpty,
  IsObject,
  IsPhoneNumber,
  IsSemVer,
  IsString,
  IsUUID,
  MaxDate,
  MaxLength,
  MinDate,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  Arg,
  Args,
  ArgsType,
  Field,
  Float,
  InputType,
  Int,
  Mutation,
  Query,
  Resolver,
  registerEnumType,
} from "type-graphql";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// Decorator import
import { SortingArg } from "@modules/sorting/infrastructure/graphql/decorators/sortingArg.decorator";
import { IsNullable } from "@shared/decorators/isNullable.decorator";
import { NameString } from "@shared/decorators/nameString.decorator";
import { ValidInt } from "@shared/decorators/validInt.decorator";
import { ValidString } from "@shared/decorators/validString.decorator";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";

// Scalar import
import { JSONScalar } from "@shared/types/json.scalar";

// Target import
import { buildMcpToolInputShape } from "./mcpToolInputShape.util";

enum MCP_PROBE_KIND {
  CSV = "text/csv",
  ZIP = "application/zip",
}
registerEnumType(MCP_PROBE_KIND, { name: "MCP_PROBE_KIND" });

const EARLIEST = new Date("2030-01-01T00:00:00Z");
const LATEST = new Date("2030-12-31T00:00:00Z");

@InputType("McpProbeParameterInput")
class McpProbeParameterSchema {
  @ValidString()
  @Field({ description: "The parameter name." })
  name: string;

  @ValidString({ nullable: "allowNull" })
  @Field(() => String, { nullable: true })
  default_value: string | null;
}

@InputType("McpProbeDefinitionInput")
class McpProbeDefinitionSchema {
  @NameString()
  @Field({ description: "Its name." })
  name: string;

  @ValidString({ nullable: true })
  @Field(() => String, { nullable: true })
  note?: string | null;

  @MinLength(3, { message: "The code is too short." })
  @Field()
  code: string;

  @ValidInt()
  @Field(() => Int)
  size: number;

  @ValidString()
  @IsEnum(MCP_PROBE_KIND)
  @IsMimeType()
  @Field(() => MCP_PROBE_KIND)
  kind: MCP_PROBE_KIND;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Field(() => [String])
  patterns: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => McpProbeParameterSchema)
  @Field(() => [McpProbeParameterSchema])
  parameters: McpProbeParameterSchema[];

  @IsBoolean()
  @Field()
  enabled: boolean;

  @IsObject()
  @Field(() => JSONScalar)
  payload: Record<string, unknown>;

  @IsDate()
  @MinDate(EARLIEST, { message: "Too early." })
  @MaxDate(() => LATEST)
  @Field(() => Date)
  at: Date;

  @IsUUID(4)
  @Field()
  owner_id: string;

  @IsHash("md5")
  @Field()
  md5_hash: string;

  @IsPhoneNumber()
  @Field()
  phone_number: string;

  @IsLocale()
  @Field()
  language: string;

  @IsSemVer()
  @Field()
  version: string;
}

@ArgsType()
class McpProbeBaseFilterSchema {
  @ValidString({ nullable: "allowUndefined" })
  @Field(() => String, { nullable: true, description: "Only these owners." })
  owner_id?: string;
}

@ArgsType()
class McpProbeFilterSchema extends McpProbeBaseFilterSchema {
  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  archived?: boolean;
}

@ArgsType()
class McpProbeGrowingSchema {
  @IsBoolean()
  @Field()
  archived: boolean;
}

@ArgsType()
class McpProbeEmailSchema {
  @IsEmail()
  @Field()
  email: string;
}

@ArgsType()
class McpProbeBoundedSchema {
  @IsString()
  @MaxLength(5, { message: "$property of $target is too long." })
  @Field()
  label: string;

  @IsArray()
  @ArrayMaxSize(2)
  @IsString({ each: true })
  @Field(() => [String])
  labels: string[];

  @IsString()
  @IsNotEmpty({ message: "$property is required." })
  @Field()
  code: string;
}

@ArgsType()
class McpProbeRequiredFlagSchema {
  @IsBoolean()
  @IsNotEmpty()
  @Field()
  enabled: boolean;
}

@ArgsType()
class McpProbeRequiredListSchema {
  @IsArray()
  @IsNotEmpty()
  @Field(() => [String])
  tags: string[];
}

@ArgsType()
class McpProbeEchoSchema {
  @IsString()
  @MinLength(3, { message: "$value is too short." })
  @Field()
  word: string;
}

@Resolver()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class McpProbeResolver {
  @Query(() => String)
  mcpProbeHealth() {
    return "ok";
  }

  @Query(() => String)
  mcpProbeList(
    @Args() _filter: McpProbeFilterSchema,
    @SortingArg(["created_at"]) _sorting: unknown,
    @Args() _pagination: PaginationSchema,
  ) {
    return "ok";
  }

  @Mutation(() => String)
  mcpProbeCreate(
    @Arg("probe_id", { description: "The probe id." }) _probeId: string,
    @Arg("data") _data: McpProbeDefinitionSchema,
  ) {
    return "ok";
  }

  @Query(() => String)
  mcpProbeGrowing(@Args() _growing: McpProbeGrowingSchema) {
    return "ok";
  }

  @Query(() => String)
  mcpProbeEmail(@Args() _email: McpProbeEmailSchema) {
    return "ok";
  }

  @Query(() => String)
  mcpProbeRatio(@Arg("ratio", () => Float) _ratio: number) {
    return "ok";
  }

  @Query(() => String)
  mcpProbeBounded(@Args() _bounded: McpProbeBoundedSchema) {
    return "ok";
  }

  @Query(() => String)
  mcpProbeRequiredFlag(@Args() _flag: McpProbeRequiredFlagSchema) {
    return "ok";
  }

  @Query(() => String)
  mcpProbeRequiredList(@Args() _list: McpProbeRequiredListSchema) {
    return "ok";
  }

  @Query(() => String)
  mcpProbeEcho(@Args() _echo: McpProbeEchoSchema) {
    return "ok";
  }
}

const shapeOf = (document: string, inputPolicy?: z.ZodRawShape) =>
  buildMcpToolInputShape({ document, inputPolicy });

const inputOf = (document: string, inputPolicy?: z.ZodRawShape) =>
  z.object(shapeOf(document, inputPolicy));

const jsonSchemaOf = (document: string) => {
  const { properties, required } = z.toJSONSchema(inputOf(document), {
    io: "input",
  });
  return { properties, required };
};

const CREATE = "mutation { mcpProbeCreate }";
const LIST = "query { mcpProbeList }";

const VALID_DATA = {
  name: "Analyzer",
  size: 10,
  kind: "CSV",
  patterns: ["*.csv"],
  parameters: [{ name: "k", default_value: null }],
  enabled: true,
  payload: { a: 1 },
  at: "2030-06-01T00:00:00Z",
  owner_id: "8c1a4b52-4b9e-4f3e-9a51-3c1b2d4e5f60",
  md5_hash: "d41d8cd98f00b204e9800998ecf8427e",
  phone_number: "+55 55 9 9999 9999",
  language: "pt-BR",
  version: "1.2.0",
  code: "abc",
};

const acceptsData = (data: Record<string, unknown>) =>
  inputOf(CREATE).safeParse({ probe_id: "p", data: { ...VALID_DATA, ...data } })
    .success;

describe("Util: buildMcpToolInputShape", () => {
  it("should take no input for a field without arguments", () => {
    expect(shapeOf("query { mcpProbeHealth }")).toEqual({});
  });

  it("should accept a valid input as the schema classes declare it", () => {
    expect(inputOf(CREATE).parse({ probe_id: "p", data: VALID_DATA })).toEqual({
      probe_id: "p",
      data: VALID_DATA,
    });
  });

  it("should describe the arguments and fields as their declarations do, requiring what they require", () => {
    const { properties, required } = jsonSchemaOf(CREATE);

    expect([...required!].sort()).toEqual(["data", "probe_id"]);
    expect({ properties }).toMatchObject({
      properties: {
        probe_id: { type: "string", description: "The probe id." },
        data: {
          type: "object",
          properties: {
            name: {
              type: "string",
              minLength: 1,
              pattern: "^[\\p{L} ,.'-]+$",
              description: "Its name.",
            },
            note: {
              anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
            },
            code: { type: "string", minLength: 3 },
            size: {
              type: "integer",
              minimum: -2_147_483_648,
              maximum: 2_147_483_647,
            },
            kind: { type: "string", enum: ["CSV", "ZIP"] },
            patterns: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 1 },
            },
            parameters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    minLength: 1,
                    description: "The parameter name.",
                  },
                  default_value: {
                    anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
                  },
                },
                required: ["name", "default_value"],
                additionalProperties: false,
              },
            },
            enabled: { type: "boolean" },
            payload: { type: "object", additionalProperties: {} },
            at: { type: "string", format: "date-time" },
          },
          required: [
            "name",
            "code",
            "size",
            "kind",
            "patterns",
            "parameters",
            "enabled",
            "payload",
            "at",
            "owner_id",
            "md5_hash",
            "phone_number",
            "language",
            "version",
          ],
          additionalProperties: false,
        },
      },
    });
  });

  it("should refuse a key a nested input object does not declare, naming the key and where it is", () => {
    const { error } = inputOf(CREATE).safeParse({
      probe_id: "p",
      data: {
        ...VALID_DATA,
        descripton: "Typo",
        parameters: [{ name: "k", default_value: null, sequense: 1 }],
      },
    });

    expect(error!.issues).toEqual([
      {
        code: "unrecognized_keys",
        keys: ["sequense"],
        path: ["data", "parameters", 0],
        message: 'Unrecognized key: "sequense"',
      },
      {
        code: "unrecognized_keys",
        keys: ["descripton"],
        path: ["data"],
        message: 'Unrecognized key: "descripton"',
      },
    ]);
  });

  it("should bound string length and list size as the schema classes do, stating their messages with the field and class named", () => {
    const input = inputOf("query { mcpProbeBounded }");
    const messagesOf = (value: Record<string, unknown>) =>
      input
        .safeParse({ label: "short", labels: [], code: "c", ...value })
        .error!.issues.map(issue => issue.message);

    expect(jsonSchemaOf("query { mcpProbeBounded }").properties).toEqual({
      label: { type: "string", maxLength: 5 },
      labels: { type: "array", maxItems: 2, items: { type: "string" } },
      code: { type: "string", minLength: 1 },
    });
    expect(
      input.parse({ label: "short", labels: ["a", "b"], code: "c" }),
    ).toEqual({ label: "short", labels: ["a", "b"], code: "c" });
    expect(messagesOf({ label: "longer" })).toEqual([
      "label of McpProbeBoundedSchema is too long.",
    ]);
    expect(messagesOf({ labels: ["a", "b", "c"] })).toEqual([
      "Too big: expected array to have <=2 items",
    ]);
    expect(messagesOf({ code: "" })).toEqual(["code is required."]);
  });

  it.each([
    [
      "a flag",
      "query { mcpProbeRequiredFlag }",
      "McpProbeRequiredFlagSchema.enabled",
    ],
    [
      "a whole list",
      "query { mcpProbeRequiredList }",
      "McpProbeRequiredListSchema.tags",
    ],
  ])(
    "should refuse loudly a non-empty rule on %s, which only the server can state",
    (_case, document, field) => {
      expect(() => shapeOf(document)).toThrow(
        `The validation isNotEmpty on ${field} has no MCP input counterpart.`,
      );
    },
  );

  it("should refuse loudly a message that names the refused value, which only the server knows", () => {
    expect(() => shapeOf("query { mcpProbeEcho }")).toThrow(
      "The message of the validation minLength on McpProbeEchoSchema.word has no MCP input counterpart.",
    );
  });

  it.each([
    ["a name with digits", { name: "R2D2" }],
    ["an empty name", { name: "" }],
    ["a size beyond 32 bits", { size: 2_147_483_648 }],
    ["a fractional size", { size: 1.5 }],
    ["an enum's internal value", { kind: "text/csv" }],
    ["no pattern", { patterns: [] }],
    ["an empty pattern", { patterns: [""] }],
    [
      "a parameter without its nullable default",
      { parameters: [{ name: "k" }] },
    ],
    ["a JSON value other than an object", { payload: [1] }],
    ["a moment without a UTC offset", { at: "2030-06-01T00:00:00" }],
    ["a null where a value is required", { enabled: null }],
  ])("should reject %s", (_case, data) => {
    expect(acceptsData(data)).toBe(false);
  });

  it("should refuse with the schema's own message when it gives one", () => {
    const issuesOf = (data: Record<string, unknown>) =>
      inputOf(CREATE)
        .safeParse({ probe_id: "p", data: { ...VALID_DATA, ...data } })
        .error!.issues.map(issue => issue.message);

    expect(issuesOf({ name: "R2D2" })).toEqual([
      "name should contain only letters and spaces",
    ]);
    expect(issuesOf({ code: "ab" })).toEqual(["The code is too short."]);
    expect(issuesOf({ size: 1.5 })).toEqual([
      "Invalid input: expected int, received number",
    ]);
  });

  it("should accept nothing or null for a field that is optional and nullable", () => {
    expect([acceptsData({ note: null }), acceptsData({ note: "n" })]).toEqual([
      true,
      true,
    ]);
  });

  it("should leave to the server the checks JSON Schema cannot state, so their refusals keep the server's words", () => {
    expect(
      acceptsData({
        at: "2029-06-01T00:00:00Z",
        owner_id: "owner-1",
        md5_hash: "abc",
        phone_number: "call me",
        language: "not a locale!",
        version: "one",
      }),
    ).toBe(true);
  });

  it("should spread argument classes, parents included, accepting nothing but no null for a field that only allows leaving it out", () => {
    const input = inputOf(LIST);

    expect(jsonSchemaOf(LIST).properties).toMatchObject({
      owner_id: {
        type: "string",
        minLength: 1,
        description: "Only these owners.",
      },
      archived: { type: "boolean" },
    });
    expect(input.parse({})).toEqual({});
    expect(input.safeParse({ owner_id: null }).success).toBe(false);
    expect(input.safeParse({ archived: null }).success).toBe(false);
  });

  it("should offer offset pagination and sorting but not the cursor arguments", () => {
    const input = inputOf(LIST);

    expect(Object.keys(shapeOf(LIST)).sort()).toEqual(
      ["archived", "owner_id", "skip", "sorting", "take"].sort(),
    );
    expect(
      input.parse({
        take: 1000,
        skip: 0,
        sorting: [{ field: "created_at", order: "ASC" }],
      }),
    ).toEqual({
      take: 1000,
      skip: 0,
      sorting: [{ field: "created_at", order: "ASC" }],
    });
    expect(input.parse({ sorting: null })).toEqual({ sorting: null });
    expect(input.safeParse({ take: 1001 }).success).toBe(false);
    expect(input.safeParse({ skip: -1 }).success).toBe(false);
  });

  it("should offer a field added to a schema class with no change to the tool", () => {
    const before = Object.keys(shapeOf("query { mcpProbeGrowing }"));
    ValidString({ nullable: "allowUndefined" })(
      McpProbeGrowingSchema.prototype,
      "label",
    );
    Field(() => String, { nullable: true, description: "A label." })(
      McpProbeGrowingSchema.prototype,
      "label",
    );

    expect(before).toEqual(["archived"]);
    expect(jsonSchemaOf("query { mcpProbeGrowing }").properties).toEqual({
      archived: { type: "boolean" },
      label: { type: "string", minLength: 1, description: "A label." },
    });
  });

  it("should let the tool's own input policy replace what it derives for an argument", () => {
    const input = inputOf(LIST, { take: z.number().int().max(100).optional() });

    expect(input.safeParse({ take: 101 }).success).toBe(false);
    expect(input.parse({ take: 100 })).toEqual({ take: 100 });
  });

  it("should refuse loudly an input policy for an argument the field does not take", () => {
    expect(() => shapeOf(LIST, { after: z.string() })).toThrow(
      "The input policy names after, which mcpProbeList does not take.",
    );
  });

  it("should refuse loudly a field no resolver declares", () => {
    expect(() => shapeOf("query { mcpProbeMissing }")).toThrow(
      "No resolver declares the GraphQL field mcpProbeMissing.",
    );
  });

  it("should refuse loudly a validation it has no counterpart for", () => {
    expect(() => shapeOf("query { mcpProbeEmail }")).toThrow(
      "The validation isEmail on McpProbeEmailSchema.email has no MCP input counterpart.",
    );
  });

  it("should refuse loudly a type it has no counterpart for", () => {
    expect(() => shapeOf("query { mcpProbeRatio }")).toThrow(
      "The type of ratio has no MCP input counterpart.",
    );
  });
});
