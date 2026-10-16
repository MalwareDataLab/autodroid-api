import {
  ValidationArguments,
  getMetadataStorage as getValidationMetadataStorage,
} from "class-validator";
import {
  FieldNode,
  GRAPHQL_MAX_INT,
  GRAPHQL_MIN_INT,
  GraphQLInt,
  getOperationAST,
  parse,
} from "graphql";
import { getMetadataStorage as getGraphQLMetadataStorage } from "type-graphql";
import { z } from "zod";

// Constant import
import { MCP_UNOFFERED_ARGUMENTS } from "@modules/mcp/constants/mcp.constant";

// Scalar import
import { JSONScalar } from "@shared/types/json.scalar";

interface IMcpToolInputSource {
  document: string;
  inputPolicy?: z.ZodRawShape;
}

type SchemaClass = abstract new (...args: never[]) => object;

interface IDeclaredInput {
  getType: () => unknown;
  typeOptions: { nullable?: boolean | string; array?: boolean };
  description?: string;
}

interface IConstrainableType extends z.ZodType {
  min(bound: number, message?: string): IConstrainableType;
  max(bound: number, message?: string): IConstrainableType;
  regex(pattern: RegExp, message?: string): IConstrainableType;
}

type ValidationMetadata = ReturnType<
  ReturnType<
    typeof getValidationMetadataStorage
  >["getTargetValidationMetadatas"]
>[number];

const TYPE_OR_SERVER_VALIDATIONS = [
  "isString",
  "isBoolean",
  "isInt",
  "isDate",
  "isArray",
  "isObject",
  "isEnum",
  "notEquals",
  "nestedValidation",
  "isOptional",
  "conditionalValidation",
  "isUuid",
  "isHash",
  "isPhoneNumber",
  "isLocale",
  "isSemVer",
  "minDate",
  "maxDate",
  "OnlyWithConstraint",
  "CannotWithConstraint",
];

const constraintNameOf = (rule: ValidationMetadata) =>
  rule.name ?? rule.constraintCls?.name ?? rule.type;

const messageOf = (rule: ValidationMetadata, name: string, field: string) => {
  const [targetName, property] = field.split(".");
  const message =
    typeof rule.message === "function"
      ? rule.message({
          property,
          targetName,
          constraints: rule.constraints,
        } as ValidationArguments)
      : rule.message;

  if (message && /\$(value|constraint\d)/.test(message))
    throw new Error(
      `The message of the validation ${name} on ${field} has no MCP input counterpart.`,
    );

  return message
    ?.replaceAll("$property", property)
    .replaceAll("$target", targetName);
};

const applyRule = (
  zodType: IConstrainableType,
  rule: ValidationMetadata,
  field: string,
): z.ZodType => {
  const name = constraintNameOf(rule);
  if (TYPE_OR_SERVER_VALIDATIONS.includes(name)) return zodType;

  const message = messageOf(rule, name, field);

  if (["minLength", "min", "arrayMinSize"].includes(name))
    return zodType.min(rule.constraints[0], message);
  if (["maxLength", "max", "arrayMaxSize"].includes(name))
    return zodType.max(rule.constraints[0], message);
  if (name === "isNotEmpty" && zodType instanceof z.ZodString)
    return zodType.min(1, message);
  if (name === "matches")
    return zodType.regex(
      new RegExp(rule.constraints[0], rule.constraints[1]),
      message,
    );

  throw new Error(
    `The validation ${name} on ${field} has no MCP input counterpart.`,
  );
};

const enumOf = (type: unknown) =>
  getGraphQLMetadataStorage().enums.find(({ enumObj }) => enumObj === type);

const isInputClass = (type: unknown): type is SchemaClass =>
  getGraphQLMetadataStorage().inputTypes.some(({ target }) => target === type);

function inputObjectOf(
  target: SchemaClass,
  unoffered: string[] = [],
): z.ZodObject {
  const classChain: SchemaClass[] = [];
  for (
    let declaringClass = target;
    declaringClass !== Function.prototype;
    declaringClass = Object.getPrototypeOf(declaringClass)
  )
    classChain.unshift(declaringClass);

  const fields = new Map<string, IDeclaredInput>();
  classChain.forEach(declaringClass =>
    getGraphQLMetadataStorage()
      .fields.filter(
        field =>
          field.target === declaringClass && !unoffered.includes(field.name),
      )
      .forEach(field => fields.set(field.name, field)),
  );

  const rules = getValidationMetadataStorage().getTargetValidationMetadatas(
    target,
    "",
    true,
    false,
  );

  return z.strictObject(
    Object.fromEntries(
      [...fields].map(([name, field]) => [
        name,
        // eslint-disable-next-line no-use-before-define
        toInputType(
          `${target.name}.${name}`,
          field,
          rules.filter(rule => rule.propertyName === name),
        ),
      ]),
    ),
  );
}

const toPresentType = (field: string, type: unknown): z.ZodType => {
  const enumMetadata = enumOf(type);
  if (enumMetadata) return z.enum(Object.keys(enumMetadata.enumObj));
  if (isInputClass(type)) return inputObjectOf(type);
  if (type === String) return z.string();
  if (type === Boolean) return z.boolean();
  if (type === Date) return z.iso.datetime({ offset: true });
  if (type === GraphQLInt)
    return z.number().int().min(GRAPHQL_MIN_INT).max(GRAPHQL_MAX_INT);
  if (type === JSONScalar) return z.record(z.string(), z.unknown());

  throw new Error(`The type of ${field} has no MCP input counterpart.`);
};

const isSkippedFor = (
  value: null | undefined,
  rules: ValidationMetadata[],
  field: string,
) =>
  rules.some(
    rule =>
      rule.type === "conditionalValidation" &&
      !rule.constraints[0]({ [field]: value }, value),
  );

function toInputType(
  field: string,
  { getType, typeOptions, description }: IDeclaredInput,
  rules: ValidationMetadata[],
): z.ZodType {
  const type = getType();
  const propertyName = field.split(".").pop()!;
  const constraints = enumOf(type) ? [] : rules;
  const applyAll = (zodType: z.ZodType, each: boolean) =>
    constraints
      .filter(rule => !!rule.each === each)
      .reduce<z.ZodType>(
        (current, rule) =>
          applyRule(current as IConstrainableType, rule, field),
        zodType,
      );

  const present = typeOptions.array
    ? applyAll(z.array(applyAll(toPresentType(field, type), true)), false)
    : applyAll(toPresentType(field, type), false);

  const isNullable = !!typeOptions.nullable;
  const declaresPresence = rules.length > 0;
  const acceptsUndefined =
    isNullable &&
    (!declaresPresence || isSkippedFor(undefined, rules, propertyName));
  const acceptsNull =
    isNullable &&
    (!declaresPresence || isSkippedFor(null, rules, propertyName));

  const withPresence = acceptsNull ? present.nullable() : present;
  const input = acceptsUndefined ? withPresence.optional() : withPresence;
  return description ? input.describe(description) : input;
}

const rootFieldOf = (document: string) =>
  (getOperationAST(parse(document))!.selectionSet.selections[0] as FieldNode)
    .name.value;

const buildMcpToolInputShape = ({
  document,
  inputPolicy = {},
}: IMcpToolInputSource): z.ZodRawShape => {
  const storage = getGraphQLMetadataStorage();
  const fieldName = rootFieldOf(document);
  const resolver = [...storage.queries, ...storage.mutations].find(
    ({ schemaName }) => schemaName === fieldName,
  );
  if (!resolver)
    throw new Error(`No resolver declares the GraphQL field ${fieldName}.`);

  const derivedShape: Record<string, z.ZodType> = {};
  storage.params
    .filter(
      param =>
        param.target === resolver.target &&
        param.methodName === resolver.methodName,
    )
    .sort((left, right) => left.index - right.index)
    .forEach(param => {
      if (param.kind === "args")
        Object.assign(
          derivedShape,
          inputObjectOf(param.getType() as SchemaClass, MCP_UNOFFERED_ARGUMENTS)
            .shape,
        );
      if (param.kind === "arg")
        derivedShape[param.name] = toInputType(param.name, param, []);
    });

  const undeclared = Object.keys(inputPolicy).find(
    name => !(name in derivedShape),
  );
  if (undeclared)
    throw new Error(
      `The input policy names ${undeclared}, which ${fieldName} does not take.`,
    );

  return { ...derivedShape, ...inputPolicy };
};

export { buildMcpToolInputShape };
