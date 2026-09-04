import { describe, expect, it } from "vitest";

// i18n import
import { t } from "@shared/i18n";

// Enum import
import { PROCESSOR_PARAMETER_TYPE } from "../types/processorParameterType.enum";

// Schema import
import { ProcessorConfigurationParameterSchema } from "../schemas/processor.schema";

// Test target import
import { validateProcessorConfigurationParameters } from "./validateProcessorConfigurationParameters.util";

const buildParameter = (
  overrides: Partial<ProcessorConfigurationParameterSchema>,
): ProcessorConfigurationParameterSchema => ({
  sequence: 0,
  name: "name",
  description: "description",
  type: PROCESSOR_PARAMETER_TYPE.STRING,
  is_required: false,
  default_value: null,
  ...overrides,
});

describe("Utils: validateProcessorConfigurationParameters", () => {
  it("should not throw for an empty parameter list", () => {
    expect(() =>
      validateProcessorConfigurationParameters({ parameters: [], t }),
    ).not.toThrow();
  });

  it("should not throw for a valid parameter with a valid default value", () => {
    expect(() =>
      validateProcessorConfigurationParameters({
        parameters: [
          buildParameter({
            type: PROCESSOR_PARAMETER_TYPE.INTEGER,
            default_value: "5",
          }),
        ],
        t,
      }),
    ).not.toThrow();
  });

  it("should throw when a parameter name is repeated", () => {
    expect(() =>
      validateProcessorConfigurationParameters({
        parameters: [
          buildParameter({ sequence: 0, name: "same" }),
          buildParameter({ sequence: 1, name: "same" }),
        ],
        t,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/REPEATED_PARAMETER",
      }),
    );
  });

  it("should throw when a parameter sequence is repeated", () => {
    expect(() =>
      validateProcessorConfigurationParameters({
        parameters: [
          buildParameter({ sequence: 0, name: "first" }),
          buildParameter({ sequence: 0, name: "second" }),
        ],
        t,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/REPEATED_PARAMETER",
      }),
    );
  });

  it("should throw when a parameter type is invalid", () => {
    expect(() =>
      validateProcessorConfigurationParameters({
        parameters: [
          buildParameter({
            type: "FLOAT" as unknown as PROCESSOR_PARAMETER_TYPE,
          }),
        ],
        t,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/INVALID_PARAMETER_TYPE",
      }),
    );
  });

  it("should throw when a parameter default value is invalid", () => {
    expect(() =>
      validateProcessorConfigurationParameters({
        parameters: [
          buildParameter({
            type: PROCESSOR_PARAMETER_TYPE.INTEGER,
            default_value: "not-a-number",
          }),
        ],
        t,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@validate_processor_configuration_parameters/INVALID_PARAMETER_DEFAULT_VALUE",
      }),
    );
  });
});
