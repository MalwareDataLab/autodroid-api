import "reflect-metadata";
import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import AppInfo from "@/package.json";

dotenv.config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
});

const argv = yargs(hideBin(process.argv))
  .scriptName(AppInfo.name)
  .usage("$0 [args]")
  .option("env", {
    type: "string",
    default: "development",
    choices: ["development", "production", "staging", "none"],
    alias: "e",
    description: "Environment to run the app",
  })
  .option("port", {
    type: "number",
    alias: "p",
    description: "Custom port to run the app",
  })
  .option("set", {
    type: "array",
    alias: "s",
    description: "Set environment variables in the format KEY=VALUE",
    coerce: args => {
      const envVars: Record<string, string> = {};
      args.forEach((arg: string) => {
        const [key, value] = arg.split("=");
        if (key && value) {
          envVars[key] = value;
        }
      });
      return envVars;
    },
  })
  .help()
  .parseSync();

if (argv.port) process.env.APP_PORT = String(argv.port);
if (argv.set) {
  Object.entries(argv.set).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

process.env.APP_ENV = argv.env;

async function main() {
  import("./bootstrap");
}

main();
