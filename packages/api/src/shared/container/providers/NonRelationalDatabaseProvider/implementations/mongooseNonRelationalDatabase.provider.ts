import * as Mongoose from "mongoose";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { logger } from "@shared/utils/logger";
import { executeAction } from "@shared/utils/executeAction";

// Interface import
import { INonRelationalDatabaseProvider } from "../models/INonRelationalDatabase.provider";

const logEnabled =
  getEnvConfig().NON_RELATIONAL_DATABASE_LOGGER_ENABLED === "true";

class MongooseNonRelationalDatabaseProvider
  implements INonRelationalDatabaseProvider
{
  public readonly initialization: Promise<void>;

  public readonly connection: Mongoose.Connection;

  constructor(uri = getEnvConfig().NON_RELATIONAL_DATABASE_URL) {
    const mongooseClient = Mongoose.createConnection();

    if (logEnabled) {
      mongooseClient.on("error", error => {
        logger.error(`❌ MongoDB: ${error}`);
      });

      mongooseClient.on("disconnected", () => {
        logger.error("❌ MongoDB: disconnected from the database.");
      });
    }

    mongooseClient.plugin(schema => {
      // eslint-disable-next-line func-names
      schema.virtual("id").get(function () {
        // eslint-disable-next-line no-underscore-dangle
        return (this._id as any).toHexString();
      });

      schema.set("toJSON", {
        virtuals: true,
      });

      schema.set("toObject", {
        virtuals: true,
      });
    });

    this.connection = mongooseClient;
    this.initialization = executeAction({
      action: () =>
        this.connection.openUri(uri, {
          ...(!!getEnvConfig().isTestEnv && {
            directConnection: true,
          }),
        }),
      actionName: "Non-relational Database connection",
      logging: true,
    });
  }
}

export { MongooseNonRelationalDatabaseProvider };
