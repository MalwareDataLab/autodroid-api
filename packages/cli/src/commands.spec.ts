import { beforeEach, describe, expect, it, vi } from "vitest";

// Target import
import {
  estimateProcessingFinish,
  estimateProcessingTime,
  listDatasets,
  listProcesses,
  listProcessors,
  login,
  logout,
  runProcessing,
  showProcessing,
  updateProfile,
  whoami,
} from "./commands";

const h = vi.hoisted(() => ({
  executeGraphQL: vi.fn(),
  signInWithPassword: vi.fn(),
  writeSession: vi.fn(),
  clearSession: vi.fn(),
  resolveIdToken: vi.fn(),
  getCliConfig: vi.fn(),
}));

vi.mock("./client/autodroidClient", () => ({
  executeGraphQL: h.executeGraphQL,
}));

vi.mock("./auth/firebaseSession", () => ({
  signInWithPassword: h.signInWithPassword,
}));

vi.mock("./auth/sessionStore", () => ({
  writeSession: h.writeSession,
  clearSession: h.clearSession,
}));

vi.mock("./context", () => ({
  resolveIdToken: h.resolveIdToken,
  getCliConfig: h.getCliConfig,
}));

const session = {
  idToken: "id-token",
  refreshToken: "refresh-token",
  expiresAt: 2_000_000_000_000,
};

describe("CLI: commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.getCliConfig.mockReturnValue({
      endpoint: "https://api.example.test/graphql",
      apiKey: "web-api-key",
    });
    h.resolveIdToken.mockResolvedValue("id-token");
  });

  describe("login", () => {
    it("should store the session obtained from the credentials", async () => {
      h.signInWithPassword.mockResolvedValue(session);

      const result = await login({
        email: "user@example.test",
        password: "secret",
      });

      expect(h.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.test",
        password: "secret",
        apiKey: "web-api-key",
      });
      expect(h.writeSession).toHaveBeenCalledWith(session);
      expect(result).toEqual({ expiresAt: session.expiresAt });
    });
  });

  describe("logout", () => {
    it("should drop the stored session", async () => {
      await logout();

      expect(h.clearSession).toHaveBeenCalledOnce();
    });
  });

  describe("whoami", () => {
    it("should return the authenticated user", async () => {
      h.executeGraphQL.mockResolvedValue({ user: { id: "user-1" } });

      await expect(whoami()).resolves.toEqual({ id: "user-1" });
      expect(h.executeGraphQL).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: "https://api.example.test/graphql",
          idToken: "id-token",
          query: expect.stringContaining("user"),
        }),
      );
    });
  });

  describe("listDatasets", () => {
    it("should unwrap the dataset connection", async () => {
      h.executeGraphQL.mockResolvedValue({
        userDatasets: { edges: [{ node: { id: "dataset-1" } }] },
      });

      await expect(listDatasets({ first: 5 })).resolves.toEqual([
        { id: "dataset-1" },
      ]);
      expect(h.executeGraphQL).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { skip: 0, take: 5 },
          query: expect.stringContaining("$skip: Int, $take: Int"),
        }),
      );
    });
  });

  describe("listProcessors", () => {
    it("should unwrap the processor connection", async () => {
      h.executeGraphQL.mockResolvedValue({
        userProcessors: { edges: [{ node: { id: "processor-1" } }] },
      });

      await expect(listProcessors({ first: 10 })).resolves.toEqual([
        { id: "processor-1" },
      ]);
      expect(h.executeGraphQL).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { skip: 0, take: 10 },
          query: expect.stringContaining("$skip: Int, $take: Int"),
        }),
      );
    });
  });

  describe("listProcesses", () => {
    it("should unwrap the processing connection", async () => {
      h.executeGraphQL.mockResolvedValue({
        userProcesses: { edges: [{ node: { id: "processing-1" } }] },
      });

      await expect(listProcesses({ first: 10 })).resolves.toEqual([
        { id: "processing-1" },
      ]);
      expect(h.executeGraphQL).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { skip: 0, take: 10 },
          query: expect.stringContaining("$skip: Int, $take: Int"),
        }),
      );
    });
  });

  describe("showProcessing", () => {
    it("should return a single processing by id", async () => {
      h.executeGraphQL.mockResolvedValue({
        userProcessing: { id: "processing-1", status: "SUCCEEDED" },
      });

      await expect(
        showProcessing({ processingId: "processing-1" }),
      ).resolves.toEqual({ id: "processing-1", status: "SUCCEEDED" });
      expect(h.executeGraphQL).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { processing_id: "processing-1" },
        }),
      );
    });
  });

  describe("updateProfile", () => {
    it("should send the updated profile fields and return the result", async () => {
      h.executeGraphQL.mockResolvedValue({
        userUpdateData: { id: "user-1", name: "Ada Lovelace" },
      });

      await expect(
        updateProfile({
          name: "Ada Lovelace",
          phoneNumber: "+55 51 9 9999 9999",
          language: "en-us",
          notificationsEnabled: true,
        }),
      ).resolves.toEqual({ id: "user-1", name: "Ada Lovelace" });
      expect(h.executeGraphQL).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: {
            data: {
              name: "Ada Lovelace",
              phone_number: "+55 51 9 9999 9999",
              language: "en-us",
              notifications_enabled: true,
            },
          },
        }),
      );
    });
  });

  describe("runProcessing", () => {
    it("should request a new processing run with the given parameters", async () => {
      h.executeGraphQL.mockResolvedValue({
        userRequestDatasetProcessing: { id: "processing-1", status: "PENDING" },
      });

      await expect(
        runProcessing({
          datasetId: "dataset-1",
          processorId: "processor-1",
          parameters: [{ name: "k_fold", value: "2" }],
        }),
      ).resolves.toEqual({ id: "processing-1", status: "PENDING" });
      expect(h.executeGraphQL).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: {
            data: {
              dataset_id: "dataset-1",
              processor_id: "processor-1",
              parameters: [{ name: "k_fold", value: "2" }],
            },
          },
        }),
      );
    });
  });

  describe("estimateProcessingTime", () => {
    it("should return the pre-run time estimation", async () => {
      h.executeGraphQL.mockResolvedValue({
        userProcessingTimeEstimation: { estimated_total_time: 120 },
      });

      await expect(
        estimateProcessingTime({
          datasetId: "dataset-1",
          processorId: "processor-1",
        }),
      ).resolves.toEqual({ estimated_total_time: 120 });
      expect(h.executeGraphQL).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { dataset_id: "dataset-1", processor_id: "processor-1" },
        }),
      );
    });
  });

  describe("estimateProcessingFinish", () => {
    it("should return the in-flight finish estimation", async () => {
      h.executeGraphQL.mockResolvedValue({
        userProcessingEstimatedFinish: {
          estimated_finish_time: "2099-01-01T00:00:00.000Z",
        },
      });

      await expect(
        estimateProcessingFinish({ processingId: "processing-1" }),
      ).resolves.toEqual({
        estimated_finish_time: "2099-01-01T00:00:00.000Z",
      });
      expect(h.executeGraphQL).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { processing_id: "processing-1" },
        }),
      );
    });
  });
});
