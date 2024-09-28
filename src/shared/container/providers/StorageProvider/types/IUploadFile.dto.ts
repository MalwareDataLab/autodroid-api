// DTO import
import { IParsedUserAgentInfoDTO } from "@shared/container/providers/UserAgentInfoProvider/types/IParsedUserAgentInfo.dto";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Enum import
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";

export type IGenerateUploadSignedUrlRequestParamsDTO = {
  filename: string;
  size: number;
  mimeType: MIME_TYPE;
  fileType: FILE_TYPE;
  md5Hash: string;

  allowPublicAccess: boolean;
  cloudDirDestination: string;

  user: User | null;
  agentInfo?: IParsedUserAgentInfoDTO;

  language?: string;
};
