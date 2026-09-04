import { plainToInstance, Type } from "class-transformer";
import { IsBoolean, IsDate, IsUUID } from "class-validator";
import { ArgsType, Field, InputType } from "type-graphql";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";
import { IsNullable } from "@shared/decorators/isNullable.decorator";

// DTO import
import { IFindWorkerRegistrationTokenDTO } from "../types/IWorkerRegistrationToken.dto";

@InputType()
class WorkerRegistrationTokenCreateSchema {
  @IsBoolean()
  @Field()
  is_unlimited_usage: boolean;

  @IsNullable({ nullable: true })
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, { nullable: true })
  expires_at?: Date | null;
}

@ArgsType()
class WorkerRegistrationTokenIndexSchema
  implements IFindWorkerRegistrationTokenDTO
{
  @ValidString({ nullable: "allowUndefined" })
  @Field(() => String, { nullable: true })
  token?: string;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  is_unlimited_usage?: boolean;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  user_id?: string;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  activated?: boolean;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  activatable?: boolean;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  expired?: boolean;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  archived?: boolean;

  static make(data: WorkerRegistrationTokenIndexSchema) {
    return plainToInstance(WorkerRegistrationTokenIndexSchema, data);
  }
}

export {
  WorkerRegistrationTokenCreateSchema,
  WorkerRegistrationTokenIndexSchema,
};
