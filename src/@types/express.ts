/* eslint-disable @typescript-eslint/no-namespace */
import { i18n, TFunction } from "i18next";

// DTO import
import { IParsedUserAgentInfoDTO } from "@shared/container/providers/UserAgentInfoProvider/types/IParsedUserAgentInfo.dto";
import { Session } from "@modules/user/types/IUserSession.dto";
import { WorkerSession } from "@modules/worker/entities/workerSession.entity";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

declare global {
  namespace Express {
    interface Request {
      // i18n
      t: TFunction;
      i18n: i18n;
      language: string;
      languages: string[];

      // User information
      agent_info?: IParsedUserAgentInfoDTO;

      // User
      session: Session;

      // Helpers
      pagination?: PaginationSchema;
      sorting?: SortingFieldSchema<readonly string[]>[];

      // Worker
      worker_session: WorkerSession;
    }
  }
}

export {};
