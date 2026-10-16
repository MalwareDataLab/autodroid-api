import { plainToInstance, Type } from "class-transformer";
import { IsBoolean, IsDate, IsUUID } from "class-validator";
import { ArgsType, Field, InputType } from "type-graphql";

// Decorator import
import { BooleanStringTransform } from "@shared/decorators/booleanStringTransform.decorator";
import { IsNullable } from "@shared/decorators/isNullable.decorator";
import { ValidString } from "@shared/decorators/validString.decorator";

// DTO import
import { IFindWorkerRegistrationTokenDTO } from "../types/IWorkerRegistrationToken.dto";

@InputType()
class WorkerRegistrationTokenCreateSchema {
  @IsBoolean()
  @Field({
    description: "Whether the token can register any number of workers.",
  })
  is_unlimited_usage: boolean;

  @IsNullable({ nullable: true })
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, {
    nullable: true,
    description: "When the token stops working; it never expires when omitted.",
  })
  expires_at?: Date | null;
}

@ArgsType()
class WorkerRegistrationTokenIndexSchema
  implements IFindWorkerRegistrationTokenDTO
{
  @ValidString({ nullable: "allowUndefined" })
  @Field(() => String, {
    nullable: true,
    description: "Only the token with this exact value.",
  })
  token?: string;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @BooleanStringTransform()
  @Field(() => Boolean, {
    nullable: true,
    description: "Only tokens with unlimited usage.",
  })
  is_unlimited_usage?: boolean;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, {
    nullable: true,
    description: "Only tokens of this user.",
  })
  user_id?: string;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @BooleanStringTransform()
  @Field(() => Boolean, {
    nullable: true,
    description: "Only tokens already used.",
  })
  activated?: boolean;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @BooleanStringTransform()
  @Field(() => Boolean, {
    nullable: true,
    description: "Only tokens still usable.",
  })
  activatable?: boolean;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @BooleanStringTransform()
  @Field(() => Boolean, { nullable: true, description: "Only expired tokens." })
  expired?: boolean;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @BooleanStringTransform()
  @Field(() => Boolean, {
    nullable: true,
    description: "Only archived tokens.",
  })
  archived?: boolean;

  static make(data: WorkerRegistrationTokenIndexSchema) {
    return plainToInstance(WorkerRegistrationTokenIndexSchema, data);
  }
}

export {
  WorkerRegistrationTokenCreateSchema,
  WorkerRegistrationTokenIndexSchema,
};
