import { ArgsType, Field, InputType } from "type-graphql";
import { IsBoolean, IsLocale, IsObject, IsPhoneNumber } from "class-validator";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";
import { IsNullable } from "@shared/decorators/isNullable.decorator";
import { NameString } from "@shared/decorators/nameString.decorator";

// DTO import
import { JSONScalar } from "@shared/types/json.scalar";
import { IUpdateUserDTO } from "../types/IUser.dto";

@InputType()
class UserUpdateDataSchema implements IUpdateUserDTO {
  @NameString()
  @Field()
  name: string;

  @ValidString({ nullable: true })
  @IsPhoneNumber()
  @Field(() => String, { nullable: true })
  phone_number?: string | null;

  @ValidString({ nullable: true })
  @IsLocale()
  @Field(() => String, { nullable: true })
  language?: string | null;

  @IsNullable()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  notifications_enabled?: boolean | null | undefined;
}

@ArgsType()
class UserUpdateLearningDataSchema {
  @IsObject()
  @Field(() => JSONScalar)
  data: Record<string, any>;
}

export { UserUpdateDataSchema, UserUpdateLearningDataSchema };
