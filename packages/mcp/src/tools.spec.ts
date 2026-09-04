import { beforeEach, describe, expect, it, vi } from "vitest";

// Target import
import { buildTools } from "./tools";

const h = vi.hoisted(() => ({
  whoami: vi.fn(),
  listDatasets: vi.fn(),
  listProcessors: vi.fn(),
  listProcesses: vi.fn(),
  showProcessing: vi.fn(),
  estimateProcessingTime: vi.fn(),
  estimateProcessingFinish: vi.fn(),
}));

vi.mock("autodroid-cli", () => h);

const callTool = async (name: string, input: Record<string, any> = {}) => {
  const tool = buildTools().find(candidate => candidate.name === name);

  if (!tool) throw new Error(`Tool ${name} is not registered.`);

  return tool.handle(input);
};

describe("MCP: tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should expose the whole read surface of the api", () => {
    expect(buildTools().map(tool => tool.name)).toEqual([
      "autodroid_whoami",
      "autodroid_list_datasets",
      "autodroid_list_processors",
      "autodroid_list_processes",
      "autodroid_show_processing",
      "autodroid_estimate_processing_time",
      "autodroid_estimate_processing_finish",
    ]);
  });

  it("should describe every tool for the model", () => {
    buildTools().forEach(tool => {
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.inputSchema).toBeDefined();
    });
  });

  it("should answer whoami with the authenticated user", async () => {
    h.whoami.mockResolvedValue({ id: "user-1", email: "user@example.test" });

    await expect(callTool("autodroid_whoami")).resolves.toEqual({
      id: "user-1",
      email: "user@example.test",
    });
  });

  it("should list datasets with the requested page size", async () => {
    h.listDatasets.mockResolvedValue([{ id: "dataset-1" }]);

    await expect(
      callTool("autodroid_list_datasets", { first: 5 }),
    ).resolves.toEqual([{ id: "dataset-1" }]);
    expect(h.listDatasets).toHaveBeenCalledWith({ first: 5 });
  });

  it("should default the dataset page size", async () => {
    h.listDatasets.mockResolvedValue([]);

    await callTool("autodroid_list_datasets");

    expect(h.listDatasets).toHaveBeenCalledWith({ first: 10 });
  });

  it("should list processors", async () => {
    h.listProcessors.mockResolvedValue([{ id: "processor-1" }]);

    await expect(callTool("autodroid_list_processors")).resolves.toEqual([
      { id: "processor-1" },
    ]);
    expect(h.listProcessors).toHaveBeenCalledWith({ first: 10 });
  });

  it("should list processes", async () => {
    h.listProcesses.mockResolvedValue([{ id: "processing-1" }]);

    await expect(callTool("autodroid_list_processes")).resolves.toEqual([
      { id: "processing-1" },
    ]);
    expect(h.listProcesses).toHaveBeenCalledWith({ first: 10 });
  });

  it("should show a single processing", async () => {
    h.showProcessing.mockResolvedValue({ id: "processing-1" });

    await expect(
      callTool("autodroid_show_processing", { processingId: "processing-1" }),
    ).resolves.toEqual({ id: "processing-1" });
    expect(h.showProcessing).toHaveBeenCalledWith({
      processingId: "processing-1",
    });
  });

  it("should refuse to show a processing without an id", async () => {
    await expect(callTool("autodroid_show_processing")).rejects.toThrowError(
      "processingId is required.",
    );
    expect(h.showProcessing).not.toHaveBeenCalled();
  });

  it("should estimate a processing run's duration before starting it", async () => {
    h.estimateProcessingTime.mockResolvedValue({ estimated_total_time: 120 });

    await expect(
      callTool("autodroid_estimate_processing_time", {
        datasetId: "dataset-1",
        processorId: "processor-1",
      }),
    ).resolves.toEqual({ estimated_total_time: 120 });
    expect(h.estimateProcessingTime).toHaveBeenCalledWith({
      datasetId: "dataset-1",
      processorId: "processor-1",
    });
  });

  it("should refuse to estimate processing time without a datasetId", async () => {
    await expect(
      callTool("autodroid_estimate_processing_time", {
        processorId: "processor-1",
      }),
    ).rejects.toThrowError("datasetId is required.");
    expect(h.estimateProcessingTime).not.toHaveBeenCalled();
  });

  it("should refuse to estimate processing time without a processorId", async () => {
    await expect(
      callTool("autodroid_estimate_processing_time", {
        datasetId: "dataset-1",
      }),
    ).rejects.toThrowError("processorId is required.");
    expect(h.estimateProcessingTime).not.toHaveBeenCalled();
  });

  it("should estimate when an in-progress processing run will finish", async () => {
    h.estimateProcessingFinish.mockResolvedValue({
      estimated_finish_time: "2099-01-01T00:00:00.000Z",
    });

    await expect(
      callTool("autodroid_estimate_processing_finish", {
        processingId: "processing-1",
      }),
    ).resolves.toEqual({ estimated_finish_time: "2099-01-01T00:00:00.000Z" });
    expect(h.estimateProcessingFinish).toHaveBeenCalledWith({
      processingId: "processing-1",
    });
  });

  it("should refuse to estimate a finish time without a processingId", async () => {
    await expect(
      callTool("autodroid_estimate_processing_finish"),
    ).rejects.toThrowError("processingId is required.");
    expect(h.estimateProcessingFinish).not.toHaveBeenCalled();
  });
});
