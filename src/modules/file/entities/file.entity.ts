import { container } from "tsyringe";
import {
  // Authorized, // TODO
  Directive,
  Field,
  ID,
  Int,
  ObjectType,
} from "type-graphql";
import { Exclude, Type } from "class-transformer";

// Type import
import { FileEntityType } from "@shared/types/models";

// Scalar import
import { JSONScalar } from "@shared/types/json.scalar";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";
import { Processing } from "@modules/processing/entities/processing.entity";
import { PaginationConnection } from "@modules/pagination/entities/paginationConnection.entity";

// Enum import
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { FILE_TYPE } from "../types/fileType.enum";
import { FILE_PROVIDER_STATUS } from "../types/fileProviderStatus.enum";

// Service import
import { ProcessFilePublicAccessService } from "../services/processFilePublicAccess.service";

@ObjectType()
class File implements FileEntityType {
  @Field(() => ID)
  id: string;

  @Field(() => STORAGE_PROVIDER)
  storage_provider: STORAGE_PROVIDER;

  @Field()
  provider_path: string;

  @Field(() => FILE_PROVIDER_STATUS)
  provider_status: FILE_PROVIDER_STATUS;

  @Field(() => Date, { nullable: true })
  provider_verified_at: Date | null;

  @Field(() => FILE_TYPE)
  type: FILE_TYPE;

  @Field(() => String, { nullable: true })
  upload_url: string | null;

  @Field(() => Date, { nullable: true })
  upload_url_expires_at: Date | null;

  @Field()
  allow_public_access: boolean;

  // See File resolver for more information
  @Exclude()
  public_url: string | null;

  @Field(() => Date, { nullable: true })
  public_url_expires_at: Date | null;

  @Field()
  filename: string;

  @Field(() => MIME_TYPE)
  mime_type: MIME_TYPE;

  @Field(() => Int)
  size: number;

  @Field()
  md5_hash: string;

  // @Authorized(["ADMIN"]) // TODO
  @Directive("@auth(requires: ADMIN)")
  @Field(() => JSONScalar)
  payload: Record<string, any>;

  @Field()
  created_at: Date;

  @Field()
  updated_at: Date;

  /* Relations */

  @Exclude()
  @Type(() => Dataset)
  dataset: Dataset;

  @Exclude()
  @Type(() => Processing)
  processes: Processing[];

  static async process(params: File): Promise<File> {
    const processFilePublicAccessService = container.resolve(
      ProcessFilePublicAccessService,
    );
    return processFilePublicAccessService.execute({
      cls: File,
      obj: params,
    });
  }
}

const PaginatedFile = PaginationConnection(File);
export type PaginatedFile = InstanceType<typeof PaginatedFile>;

export { File, PaginatedFile };
