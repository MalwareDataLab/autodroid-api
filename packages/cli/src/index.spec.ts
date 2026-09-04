import { beforeEach, describe, expect, it, vi } from "vitest";

// Target import
import { runCli } from "./index";

const h = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  whoami: vi.fn(),
  listDatasets: vi.fn(),
  listProcessors: vi.fn(),
  listProcesses: vi.fn(),
  showProcessing: vi.fn(),
  updateProfile: vi.fn(),
  runProcessing: vi.fn(),
  estimateProcessingTime: vi.fn(),
  estimateProcessingFinish: vi.fn(),
}));

vi.mock("./commands", () => h);

describe("CLI: runCli", () => {
  let output: string[];
  let table: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    output = [];
    vi.spyOn(console, "log").mockImplementation(line => {
      output.push(String(line));
    });
    vi.spyOn(console, "error").mockImplementation(line => {
      output.push(String(line));
    });
    table = vi.spyOn(console, "table").mockImplementation(() => undefined);
  });

  it("should log in with the supplied credentials", async () => {
    h.login.mockResolvedValue({ expiresAt: 1700000000000 });

    const code = await runCli([
      "login",
      "--email",
      "user@example.test",
      "--password",
      "secret",
    ]);

    expect(h.login).toHaveBeenCalledWith({
      email: "user@example.test",
      password: "secret",
    });
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("Logged in");
  });

  it("should log in with the password from AUTODROID_CLI_PASSWORD when --password is omitted", async () => {
    h.login.mockResolvedValue({ expiresAt: 1700000000000 });
    vi.stubEnv("AUTODROID_CLI_PASSWORD", "env-secret");

    const code = await runCli(["login", "--email", "user@example.test"]);

    expect(h.login).toHaveBeenCalledWith({
      email: "user@example.test",
      password: "env-secret",
    });
    expect(code).toBe(0);

    vi.unstubAllEnvs();
  });

  it("should fail login when no password source is available non-interactively", async () => {
    const code = await runCli(["login", "--email", "user@example.test"]);

    expect(h.login).not.toHaveBeenCalled();
    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Password is required.");
  });

  it("should log out", async () => {
    const code = await runCli(["logout"]);

    expect(h.logout).toHaveBeenCalledOnce();
    expect(code).toBe(0);
  });

  it("should print the current user as a formatted table by default", async () => {
    h.whoami.mockResolvedValue({ id: "user-1" });

    const code = await runCli(["whoami"]);

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("id: user-1");
  });

  it("should print the current user as json when --json is passed", async () => {
    h.whoami.mockResolvedValue({ id: "user-1" });

    const code = await runCli(["whoami", "--json"]);

    expect(code).toBe(0);
    expect(output.join("\n")).toContain('"id": "user-1"');
  });

  it("should list the datasets with the requested page size", async () => {
    h.listDatasets.mockResolvedValue([{ id: "dataset-1" }]);

    await runCli(["datasets", "--first", "3"]);

    expect(h.listDatasets).toHaveBeenCalledWith({ first: 3 });
    expect(table).toHaveBeenCalledWith([{ id: "dataset-1" }]);
  });

  it("should report no results when the dataset list is empty", async () => {
    h.listDatasets.mockResolvedValue([]);

    const code = await runCli(["datasets"]);

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("No results.");
  });

  it("should list the processors", async () => {
    h.listProcessors.mockResolvedValue([]);

    await runCli(["processors"]);

    expect(h.listProcessors).toHaveBeenCalledWith({ first: 10 });
  });

  it("should list the processes", async () => {
    h.listProcesses.mockResolvedValue([]);

    await runCli(["processes"]);

    expect(h.listProcesses).toHaveBeenCalledWith({ first: 10 });
  });

  it("should show one processing", async () => {
    h.showProcessing.mockResolvedValue({ id: "processing-1" });

    await runCli(["processing", "processing-1"]);

    expect(h.showProcessing).toHaveBeenCalledWith({
      processingId: "processing-1",
    });
  });

  it("should serialise nested fields instead of printing [object Object]", async () => {
    h.showProcessing.mockResolvedValue({
      id: "processing-1",
      dataset: { id: "dataset-1", description: "test" },
    });

    await runCli(["processing", "processing-1"]);

    expect(output.join("\n")).toContain(
      'dataset: {"id":"dataset-1","description":"test"}',
    );
  });

  it("should report a failure with a non zero exit code", async () => {
    h.whoami.mockRejectedValue(new Error("Not authenticated."));

    const code = await runCli(["whoami"]);

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Not authenticated.");
  });

  it("should report a clean one-line message for a yargs validation failure, not a stack trace", async () => {
    const code = await runCli(["login", "--password", "secret"]);

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Missing required argument: email");
    expect(output.join("\n")).not.toContain(" at ");
  });

  it("should show one processing via the explicit show subcommand", async () => {
    h.showProcessing.mockResolvedValue({ id: "processing-1" });

    await runCli(["processing", "show", "processing-1"]);

    expect(h.showProcessing).toHaveBeenCalledWith({
      processingId: "processing-1",
    });
  });

  it("should update the profile with the given fields", async () => {
    h.updateProfile.mockResolvedValue({ id: "user-1", name: "Ada Lovelace" });

    const code = await runCli([
      "profile",
      "update",
      "--name",
      "Ada Lovelace",
      "--phone-number",
      "+55 51 9 9999 9999",
      "--language",
      "en-us",
      "--notifications-enabled",
    ]);

    expect(code).toBe(0);
    expect(h.updateProfile).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      phoneNumber: "+55 51 9 9999 9999",
      language: "en-us",
      notificationsEnabled: true,
    });
  });

  it("should start a processing run with parsed --param values", async () => {
    h.runProcessing.mockResolvedValue({
      id: "processing-1",
      status: "PENDING",
    });

    const code = await runCli([
      "processing",
      "run",
      "--dataset-id",
      "dataset-1",
      "--processor-id",
      "processor-1",
      "--param",
      "k_fold=2",
      "--param",
      "verbosity=high",
    ]);

    expect(code).toBe(0);
    expect(h.runProcessing).toHaveBeenCalledWith({
      datasetId: "dataset-1",
      processorId: "processor-1",
      parameters: [
        { name: "k_fold", value: "2" },
        { name: "verbosity", value: "high" },
      ],
    });
  });

  it("should reject a malformed --param value", async () => {
    const code = await runCli([
      "processing",
      "run",
      "--dataset-id",
      "dataset-1",
      "--processor-id",
      "processor-1",
      "--param",
      "not-a-pair",
    ]);

    expect(code).toBe(1);
    expect(h.runProcessing).not.toHaveBeenCalled();
    expect(output.join("\n")).toContain(
      'Invalid --param "not-a-pair", expected name=value.',
    );
  });

  it("should estimate a processing run's duration before starting it", async () => {
    h.estimateProcessingTime.mockResolvedValue({ estimated_total_time: 120 });

    const code = await runCli([
      "processing",
      "estimate",
      "--dataset-id",
      "dataset-1",
      "--processor-id",
      "processor-1",
    ]);

    expect(code).toBe(0);
    expect(h.estimateProcessingTime).toHaveBeenCalledWith({
      datasetId: "dataset-1",
      processorId: "processor-1",
    });
  });

  it("should estimate when an in-progress processing run will finish", async () => {
    h.estimateProcessingFinish.mockResolvedValue({
      estimated_finish_time: "2099-01-01T00:00:00.000Z",
    });

    const code = await runCli([
      "processing",
      "finish-estimate",
      "processing-1",
    ]);

    expect(code).toBe(0);
    expect(h.estimateProcessingFinish).toHaveBeenCalledWith({
      processingId: "processing-1",
    });
  });
});
