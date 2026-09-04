import { describe, expect, it } from "vitest";

// Entity import
import { Processor } from "../entities/processor.entity";

// Enum import
import { PROCESSOR_PARAMETER_TYPE } from "../types/processorParameterType.enum";

// Factory import
import { processorFactory } from "../entities/factories/processor.factory";

// Test target import
import { validateProcessor } from "./validateProcessor.util";

const buildValidProcessor = (): Processor => {
  const processor = processorFactory.build();
  processor.configuration = {
    parameters: [
      {
        sequence: 0,
        name: "threshold",
        description: "threshold value",
        type: PROCESSOR_PARAMETER_TYPE.INTEGER,
        is_required: true,
        default_value: "10",
      },
    ],
    dataset_input_argument: "--input",
    dataset_input_value: "input.csv",
    dataset_output_argument: "--output",
    dataset_output_value: "output.csv",
    command: "run",
    output_metrics_file_glob_patterns: ["*.metrics"],
    output_result_file_glob_patterns: ["*.result"],
  };
  return processor;
};

describe("Utils: validateProcessor", () => {
  it("should resolve for a valid processor", async () => {
    await expect(
      validateProcessor(buildValidProcessor()),
    ).resolves.toBeUndefined();
  });

  it("should throw when the processor is invalid", async () => {
    const processor = processorFactory.build();

    await expect(validateProcessor(processor)).rejects.toThrowError(
      expect.objectContaining({
        key: "@validate_processor/PROCESSOR_VALIDATION_ERROR",
      }),
    );
  });
});
