import { plainToInstance } from "class-transformer";
import { IsBoolean, IsHash, IsUUID, IsObject } from "class-validator";
import { ArgsType, Field } from "type-graphql";

// Decorator import
import { BooleanStringTransform } from "@shared/decorators/booleanStringTransform.decorator";
import { IsNullable } from "@shared/decorators/isNullable.decorator";
import { ValidString } from "@shared/decorators/validString.decorator";

// DTO import
import { IFindWorkerDTO } from "../types/IWorker.dto";

// Scalar import
import { JSONScalar } from "@shared/types/json.scalar";

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

  @ValidString()
  @Field()
  name: string;
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
  @Field(() => String, {
    nullable: true,
    description: "Only workers of this user.",
  })
  user_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, {
    nullable: true,
    description: "Only workers registered with this token.",
  })
  registration_token_id?: string;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @BooleanStringTransform()
  @Field(() => Boolean, {
    nullable: true,
    description: "Only workers marked missing.",
  })
  missing?: boolean;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @BooleanStringTransform()
  @Field(() => Boolean, {
    nullable: true,
    description: "Only archived workers.",
  })
  archived?: boolean;

  static make(data: WorkerIndexSchema) {
    return plainToInstance(WorkerIndexSchema, data);
  }
}

export { WorkerRegisterSchema, WorkerRefreshTokenSchema, WorkerIndexSchema };
