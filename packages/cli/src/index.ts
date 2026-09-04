import yargs from "yargs";

// Command import
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

// Auth import
import { resolvePassword } from "./auth/resolvePassword";

// UI import
import { withSpinner } from "./ui/withSpinner";

const printResult = (
  value: Record<string, unknown> | unknown[],
  json: boolean,
): void => {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      console.log("No results.");
      return;
    }
    console.table(value);
    return;
  }

  Object.entries(value).forEach(([key, entry]) => {
    const display =
      entry && typeof entry === "object" ? JSON.stringify(entry) : entry;
    console.log(`${key}: ${display}`);
  });
};

const parseParams = (
  params: (string | number)[],
): { name: string; value: string }[] =>
  params.map(param => {
    const [name, ...rest] = String(param).split("=");
    if (!name || !rest.length)
      throw new Error(`Invalid --param "${param}", expected name=value.`);
    return { name, value: rest.join("=") };
  });

const runCli = async (argv: string[]): Promise<number> => {
  try {
    await yargs(argv)
      .scriptName("autodroid")
      .option("json", {
        type: "boolean",
        default: false,
        describe: "Output raw JSON instead of a formatted table.",
      })
      .command(
        "login",
        "Authenticate with an AutoDroid account.",
        builder =>
          builder
            .option("email", { type: "string", demandOption: true })
            .option("password", { type: "string" }),
        async args => {
          const password = await resolvePassword({ flagValue: args.password });
          const { expiresAt } = await withSpinner("Logging in...", () =>
            login({ email: args.email, password }),
          );
          console.log(
            `Logged in. Session valid until ${new Date(expiresAt).toISOString()}.`,
          );
        },
      )
      .command("logout", "Discard the stored session.", {}, async () => {
        await logout();
        console.log("Logged out.");
      })
      .command(
        "whoami",
        "Show the authenticated user.",
        builder => builder,
        async args => {
          printResult(await withSpinner("Loading user...", whoami), args.json);
        },
      )
      .command(
        "datasets",
        "List your datasets.",
        builder => builder.option("first", { type: "number", default: 10 }),
        async args => {
          printResult(
            await withSpinner("Loading datasets...", () =>
              listDatasets({ first: args.first }),
            ),
            args.json,
          );
        },
      )
      .command(
        "processors",
        "List the available processors.",
        builder => builder.option("first", { type: "number", default: 10 }),
        async args => {
          printResult(
            await withSpinner("Loading processors...", () =>
              listProcessors({ first: args.first }),
            ),
            args.json,
          );
        },
      )
      .command(
        "processes",
        "List your processing runs.",
        builder => builder.option("first", { type: "number", default: 10 }),
        async args => {
          printResult(
            await withSpinner("Loading processes...", () =>
              listProcesses({ first: args.first }),
            ),
            args.json,
          );
        },
      )
      .command("profile", "Manage your AutoDroid profile.", profileYargs =>
        profileYargs
          .command(
            "update",
            "Update your profile.",
            builder =>
              builder
                .option("name", { type: "string", demandOption: true })
                .option("phone-number", { type: "string" })
                .option("language", { type: "string" })
                .option("notifications-enabled", { type: "boolean" }),
            async args => {
              printResult(
                await withSpinner("Updating profile...", () =>
                  updateProfile({
                    name: args.name,
                    phoneNumber: args.phoneNumber,
                    language: args.language,
                    notificationsEnabled: args.notificationsEnabled,
                  }),
                ),
                args.json,
              );
            },
          )
          .demandCommand(1),
      )
      .command("processing", "Manage your processing runs.", processingYargs =>
        processingYargs
          .command(
            ["show <processingId>", "$0 <processingId>"],
            "Show one processing run.",
            builder =>
              builder.positional("processingId", {
                type: "string",
                demandOption: true,
              }),
            async args => {
              printResult(
                await withSpinner("Loading processing...", () =>
                  showProcessing({
                    processingId: args.processingId as string,
                  }),
                ),
                args.json,
              );
            },
          )
          .command(
            "run",
            "Start a new processing run.",
            builder =>
              builder
                .option("dataset-id", {
                  type: "string",
                  demandOption: true,
                })
                .option("processor-id", {
                  type: "string",
                  demandOption: true,
                })
                .option("param", {
                  type: "array",
                  default: [] as (string | number)[],
                  describe: "Repeatable name=value processor parameter.",
                }),
            async args => {
              printResult(
                await withSpinner("Starting processing run...", () =>
                  runProcessing({
                    datasetId: args.datasetId,
                    processorId: args.processorId,
                    parameters: parseParams(args.param),
                  }),
                ),
                args.json,
              );
            },
          )
          .command(
            "estimate",
            "Estimate a processing run's duration before starting it.",
            builder =>
              builder
                .option("dataset-id", {
                  type: "string",
                  demandOption: true,
                })
                .option("processor-id", {
                  type: "string",
                  demandOption: true,
                }),
            async args => {
              printResult(
                await withSpinner("Estimating processing time...", () =>
                  estimateProcessingTime({
                    datasetId: args.datasetId,
                    processorId: args.processorId,
                  }),
                ),
                args.json,
              );
            },
          )
          .command(
            "finish-estimate <processingId>",
            "Estimate when an in-progress processing run will finish.",
            builder =>
              builder.positional("processingId", {
                type: "string",
                demandOption: true,
              }),
            async args => {
              printResult(
                await withSpinner("Estimating finish time...", () =>
                  estimateProcessingFinish({
                    processingId: args.processingId as string,
                  }),
                ),
                args.json,
              );
            },
          )
          .demandCommand(1),
      )
      .demandCommand(1)
      .strict()
      .help()
      .fail((message, error) => {
        throw error ?? new Error(message);
      })
      .parseAsync();

    return 0;
  } catch (error: any) {
    console.error(error.message);
    return 1;
  }
};

export { runCli };
export {
  estimateProcessingFinish,
  estimateProcessingTime,
  listDatasets,
  listProcesses,
  listProcessors,
  login,
  runProcessing,
  showProcessing,
  updateProfile,
  whoami,
} from "./commands";
