import { IsBoolean, IsHash, IsUUID, IsObject } from "class-validator";
import { ArgsType, Field } from "type-graphql";
import { plainToInstance } from "class-transformer";

// Scalar import
import { JSONScalar } from "@shared/types/json.scalar";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";
import { IsNullable } from "@shared/decorators/isNullable.decorator";

// DTO import
import { IFindWorkerDTO } from "../types/IWorker.dto";

@ArgsType()
class WorkerRegisterSchema {
  @IsObject()
  @Field(() => JSONScalar)
  system_info: Record<string, any>;

  @ValidString()
  @Field()
  registration_token: string;

  @ValidString()
  @IsUUID()
  @Field()
  internal_id: string;

  @ValidString()
  @IsHash("sha256")
  @Field()
  signature: string;
}

@ArgsType()
class WorkerIdentificationSchema extends WorkerRegisterSchema {
  @ValidString()
  @IsUUID()
  @Field()
  worker_id: string;
}

@ArgsType()
class WorkerRefreshTokenSchema extends WorkerIdentificationSchema {
  @ValidString()
  @Field()
  refresh_token: string;
}

@ArgsType()
class WorkerIndexSchema implements IFindWorkerDTO {
  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  user_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  registration_token_id?: string;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  missing?: boolean;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  archived?: boolean;

  static make(data: WorkerIndexSchema) {
    return plainToInstance(WorkerIndexSchema, data);
  }
}

export { WorkerRegisterSchema, WorkerRefreshTokenSchema, WorkerIndexSchema };
