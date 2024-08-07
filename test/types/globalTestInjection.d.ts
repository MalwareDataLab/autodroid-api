import type { PrismaClient } from "@prisma/client";
import type * as Mongoose from "mongoose";

// Provider import
import type { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";
import type { INonRelationalDatabaseProvider } from "@shared/container/providers/NonRelationalDatabaseProvider/models/INonRelationalDatabase.provider";
import type { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";
import type { RedisInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/implementations/redisInMemoryDatabase.provider";

// Type import
import type { IFirebaseSessionDTO } from "../utils/startAndGetSessionToken";
import type { App } from "../utils/getServer";

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var TestInjection: {
    DatabaseProvider?: IDatabaseProvider;
    PrismaDatabaseProvider?: PrismaClient;

    NonRelationalDatabaseProvider?: INonRelationalDatabaseProvider;
    MongooseNonRelationalDatabaseProvider?: Mongoose.Connection;

    InMemoryDatabaseProvider?: IInMemoryDatabaseProvider;
    RedisInMemoryDatabaseProvider?: RedisInMemoryDatabaseProvider;

    app: App;
    session: IFirebaseSessionDTO;
  };
}
