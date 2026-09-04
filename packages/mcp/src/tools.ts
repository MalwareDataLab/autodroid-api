import { z } from "zod";

// Command import
import {
  estimateProcessingFinish,
  estimateProcessingTime,
  listDatasets,
  listProcesses,
  listProcessors,
  showProcessing,
  whoami,
} from "autodroid-cli";

interface IMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  handle: (input: Record<string, any>) => Promise<unknown>;
}

const DEFAULT_PAGE_SIZE = 10;

const pageSizeSchema = {
  first: z.number().int().positive().optional(),
};

const buildTools = (): IMcpTool[] => [
  {
    name: "autodroid_whoami",
    description: "Return the AutoDroid user the current session belongs to.",
    inputSchema: {},
    handle: () => whoami(),
  },
  {
    name: "autodroid_list_datasets",
    description: "List the malware datasets owned by the current user.",
    inputSchema: pageSizeSchema,
    handle: input => listDatasets({ first: input.first ?? DEFAULT_PAGE_SIZE }),
  },
  {
    name: "autodroid_list_processors",
    description:
      "List the data synthesis processors available to the current user.",
    inputSchema: pageSizeSchema,
    handle: input =>
      listProcessors({ first: input.first ?? DEFAULT_PAGE_SIZE }),
  },
  {
    name: "autodroid_list_processes",
    description: "List the processing runs owned by the current user.",
    inputSchema: pageSizeSchema,
    handle: input => listProcesses({ first: input.first ?? DEFAULT_PAGE_SIZE }),
  },
  {
    name: "autodroid_show_processing",
    description:
      "Show one processing run, including its status and its dataset and processor.",
    inputSchema: {
      processingId: z.string().min(1),
    },
    handle: async input => {
      if (!input.processingId) throw new Error("processingId is required.");
      return showProcessing({ processingId: input.processingId });
    },
  },
  {
    name: "autodroid_estimate_processing_time",
    description:
      "Estimate how long a processing run would take before starting it, given a dataset and a processor.",
    inputSchema: {
      datasetId: z.string().min(1),
      processorId: z.string().min(1),
    },
    handle: async input => {
      if (!input.datasetId) throw new Error("datasetId is required.");
      if (!input.processorId) throw new Error("processorId is required.");
      return estimateProcessingTime({
        datasetId: input.datasetId,
        processorId: input.processorId,
      });
    },
  },
  {
    name: "autodroid_estimate_processing_finish",
    description: "Estimate when an in-progress processing run will finish.",
    inputSchema: {
      processingId: z.string().min(1),
    },
    handle: async input => {
      if (!input.processingId) throw new Error("processingId is required.");
      return estimateProcessingFinish({ processingId: input.processingId });
    },
  },
];

export { buildTools };
export type { IMcpTool };
