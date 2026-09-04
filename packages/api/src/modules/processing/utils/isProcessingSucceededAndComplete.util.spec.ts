import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Entity import
import { File } from "@modules/file/entities/file.entity";
import { Processing } from "../entities/processing.entity";

// Enum import
import { PROCESSING_STATUS } from "../types/processingStatus.enum";

// Test target import
import { isProcessingSucceededAndComplete } from "./isProcessingSucceededAndComplete.util";

const buildFile = (public_url: string | null) => ({ public_url }) as File;

const buildProcessing = (overrides: Partial<Processing>): Processing =>
  ({
    status: PROCESSING_STATUS.SUCCEEDED,
    metrics_file: buildFile(faker.internet.url()),
    result_file: buildFile(faker.internet.url()),
    ...overrides,
  }) as Processing;

describe("Utils: isProcessingSucceededAndComplete", () => {
  it("should return false when the processing is not provided", () => {
    expect(
      isProcessingSucceededAndComplete(null as unknown as Processing),
    ).toBe(false);
  });

  it("should return false when the status is not succeeded", () => {
    expect(
      isProcessingSucceededAndComplete(
        buildProcessing({ status: PROCESSING_STATUS.FAILED }),
      ),
    ).toBe(false);
  });

  it("should return false when the metrics file is missing", () => {
    expect(
      isProcessingSucceededAndComplete(buildProcessing({ metrics_file: null })),
    ).toBe(false);
  });

  it("should return false when the metrics file has no public url", () => {
    expect(
      isProcessingSucceededAndComplete(
        buildProcessing({ metrics_file: buildFile(null) }),
      ),
    ).toBe(false);
  });

  it("should return false when the result file is missing", () => {
    expect(
      isProcessingSucceededAndComplete(buildProcessing({ result_file: null })),
    ).toBe(false);
  });

  it("should return false when the result file has no public url", () => {
    expect(
      isProcessingSucceededAndComplete(
        buildProcessing({ result_file: buildFile(null) }),
      ),
    ).toBe(false);
  });

  it("should return true when succeeded with both files public urls", () => {
    expect(isProcessingSucceededAndComplete(buildProcessing({}))).toBe(true);
  });
});
