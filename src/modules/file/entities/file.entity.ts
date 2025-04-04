import { container } from "tsyringe";
import {
  Authorized,
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
import { BigIntScalar } from "@shared/types/bigInt.scalar";

// Util import
import { ClassConstructor } from "@shared/utils/instanceParser";

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

  @Field(() => BigIntScalar)
  seq: bigint;

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

  @Authorized(["ADMIN"])
  @Directive("@auth(requires: ADMIN)")
  @Exclude()
  @Field(() => JSONScalar)
  payload: Record<string, any>;

  @Field()
  created_at: Date;

  @Field()
  updated_at: Date;

  /* Relations */

  @Exclude()
  @Type(() => Dataset)
  dataset: Dataset | null;

  @Exclude()
  @Type(() => Processing)
  processing_results: Processing[];

  @Exclude()
  @Type(() => Processing)
  processing_metrics: Processing[];

  __type = "File";
  static isFile(data: any): data is File {
    return data instanceof File || data.__type === "File";
  }

  static async process(params: File): Promise<File> {
    const processFilePublicAccessService = container.resolve(
      ProcessFilePublicAccessService,
    );
    return processFilePublicAccessService.execute({
      cls: File,
      obj: params,
    });
  }

  static async processAnyNested<T, V>({
    cls,
    data,
  }: {
    cls: ClassConstructor<T>;
    data: V;
  }): Promise<V> {
    const processFilePublicAccessService = container.resolve(
      ProcessFilePublicAccessService,
    );

    return processFilePublicAccessService.execute({
      cls,
      obj: data,
    }) as V;
  }
}

const PaginatedFile = PaginationConnection(File);
export type PaginatedFile = InstanceType<typeof PaginatedFile>;

export { File, PaginatedFile };
