import { describe, expect, it } from "vitest";

// i18n import
import { t } from "@shared/i18n";

// Entity import
import { Processor } from "@modules/processor/entities/processor.entity";
import { ProcessorParameter } from "@modules/processor/entities/processorParameter.entity";

// Enum import
import { PROCESSOR_PARAMETER_TYPE } from "@modules/processor/types/processorParameterType.enum";

// Factory import
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Test target import
import {
  validateAndParseProcessingParameters,
  processingParameterValidatorMap,
  processingParameterTypeMap,
} from "./validateAndParseProcessingParameters.util";

const buildParameter = (
  overrides: Partial<ProcessorParameter>,
): ProcessorParameter => ({
  sequence: 0,
  name: "name",
  description: "description",
  type: PROCESSOR_PARAMETER_TYPE.STRING,
  is_required: false,
  default_value: null,
  ...overrides,
});

const buildProcessor = (parameters: ProcessorParameter[]): Processor => {
  const processor = processorFactory.build();
  processor.configuration.parameters = parameters;
  return processor;
};

describe("Utils: validateAndParseProcessingParameters", () => {
  it("should throw when an unknown parameter is provided", () => {
    expect(() =>
      validateAndParseProcessingParameters({
        parameters: [{ name: "unknown", value: "value" }],
        processor: buildProcessor([]),
        t,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/UNKNOWN_PARAMETER",
      }),
    );
  });

  it("should throw when a parameter is repeated", () => {
    const processor = buildProcessor([
      buildParameter({ name: "field", type: PROCESSOR_PARAMETER_TYPE.STRING }),
    ]);

    expect(() =>
      validateAndParseProcessingParameters({
        parameters: [
          { name: "field", value: "a" },
          { name: "field", value: "b" },
        ],
        processor,
        t,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/REPEATED_PARAMETER",
      }),
    );
  });

  it("should throw when a required parameter is missing", () => {
    const processor = buildProcessor([
      buildParameter({ name: "field", is_required: true }),
    ]);

    expect(() =>
      validateAndParseProcessingParameters({
        parameters: [],
        processor,
        t,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/MISSING_PARAMETER",
      }),
    );
  });

  it("should throw when a required parameter is provided with an empty value", () => {
    const processor = buildProcessor([
      buildParameter({ name: "field", is_required: true }),
    ]);

    expect(() =>
      validateAndParseProcessingParameters({
        parameters: [{ name: "field", value: "" }],
        processor,
        t,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/MISSING_PARAMETER",
      }),
    );
  });

  it("should throw when a provided value is invalid for its type", () => {
    const processor = buildProcessor([
      buildParameter({ name: "field", type: PROCESSOR_PARAMETER_TYPE.INTEGER }),
    ]);

    expect(() =>
      validateAndParseProcessingParameters({
        parameters: [{ name: "field", value: "not-a-number" }],
        processor,
        t,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/INVALID_PARAMETER",
      }),
    );
  });

  it("should parse and sort provided parameters by sequence", () => {
    const processor = buildProcessor([
      buildParameter({
        sequence: 2,
        name: "flag",
        type: PROCESSOR_PARAMETER_TYPE.BOOLEAN,
      }),
      buildParameter({
        sequence: 1,
        name: "count",
        type: PROCESSOR_PARAMETER_TYPE.INTEGER,
      }),
      buildParameter({
        sequence: 0,
        name: "label",
        type: PROCESSOR_PARAMETER_TYPE.STRING,
      }),
    ]);

    const result = validateAndParseProcessingParameters({
      parameters: [
        { name: "flag", value: "true" },
        { name: "count", value: "5" },
        { name: "label", value: "hello" },
      ],
      processor,
      t,
    });

    expect(result).toEqual([
      { key: "label", value: "hello" },
      { key: "count", value: "5" },
      { key: "flag", value: "true" },
    ]);
  });

  it("should skip optional parameters that were not provided", () => {
    const processor = buildProcessor([
      buildParameter({ name: "optional", is_required: false }),
    ]);

    const result = validateAndParseProcessingParameters({
      parameters: [],
      processor,
      t,
    });

    expect(result).toEqual([]);
  });

  it("should validate values through the parameter validator map", () => {
    expect(
      processingParameterValidatorMap[PROCESSOR_PARAMETER_TYPE.STRING]("value"),
    ).toBe(true);
    expect(
      processingParameterValidatorMap[PROCESSOR_PARAMETER_TYPE.STRING](""),
    ).toBe(false);
    expect(
      processingParameterValidatorMap[PROCESSOR_PARAMETER_TYPE.STRING](
        123 as unknown as string,
      ),
    ).toBe(false);
    expect(
      processingParameterValidatorMap[PROCESSOR_PARAMETER_TYPE.BOOLEAN]("true"),
    ).toBe(true);
    expect(
      processingParameterValidatorMap[PROCESSOR_PARAMETER_TYPE.BOOLEAN](
        "false",
      ),
    ).toBe(true);
    expect(
      processingParameterValidatorMap[PROCESSOR_PARAMETER_TYPE.BOOLEAN]("nope"),
    ).toBe(false);
    expect(
      processingParameterValidatorMap[PROCESSOR_PARAMETER_TYPE.INTEGER]("42"),
    ).toBe(true);
    expect(
      processingParameterValidatorMap[PROCESSOR_PARAMETER_TYPE.INTEGER]("x"),
    ).toBe(false);
  });

  it("should parse values through the parameter type map", () => {
    expect(
      processingParameterTypeMap[PROCESSOR_PARAMETER_TYPE.STRING]("value"),
    ).toBe("value");
    expect(
      processingParameterTypeMap[PROCESSOR_PARAMETER_TYPE.BOOLEAN]("true"),
    ).toBe(true);
    expect(
      processingParameterTypeMap[PROCESSOR_PARAMETER_TYPE.BOOLEAN]("false"),
    ).toBe(false);
    expect(
      processingParameterTypeMap[PROCESSOR_PARAMETER_TYPE.INTEGER]("42"),
    ).toBe(42);
  });
});
