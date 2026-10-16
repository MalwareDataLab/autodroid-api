import "reflect-metadata";

import { describe, expect, it } from "vitest";

// Target import
import { ProcessingTimeEstimation } from "./processingTimeEstimation.entity";

const estimationOf = (
  estimated_execution_time: number | null,
  estimated_waiting_time: number | null,
) =>
  ProcessingTimeEstimation.make({
    dataset_id: "dataset-1",
    processor_id: "processor-1",
    estimated_execution_time,
    estimated_waiting_time,
  });

describe("Entity: ProcessingTimeEstimation", () => {
  it("should add the waiting and execution times into the total", () => {
    const estimation = estimationOf(120, 30);

    expect(estimation).toBeInstanceOf(ProcessingTimeEstimation);
    expect(estimation).toMatchObject({
      dataset_id: "dataset-1",
      processor_id: "processor-1",
      estimated_execution_time: 120,
      estimated_waiting_time: 30,
      estimated_total_time: 150,
    });
  });

  it.each([
    ["the execution time", null, 30],
    ["the waiting time", 120, null],
    ["both times", null, null],
  ])(
    "should have no total when %s is unknown",
    (_label, estimated_execution_time, estimated_waiting_time) => {
      expect(
        estimationOf(estimated_execution_time, estimated_waiting_time)
          .estimated_total_time,
      ).toBeNull();
    },
  );

  it("should keep a zero time as known", () => {
    expect(estimationOf(0, 0).estimated_total_time).toBe(0);
  });
});
