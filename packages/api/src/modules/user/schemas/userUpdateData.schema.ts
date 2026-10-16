import { IsBoolean, IsLocale, IsObject, IsPhoneNumber } from "class-validator";
import { ArgsType, Field, InputType } from "type-graphql";

// Decorator import
import { IsNullable } from "@shared/decorators/isNullable.decorator";
import { NameString } from "@shared/decorators/nameString.decorator";
import { ValidString } from "@shared/decorators/validString.decorator";

// DTO import
import { IUpdateUserDTO } from "../types/IUser.dto";

// Scalar import
import { JSONScalar } from "@shared/types/json.scalar";

@InputType()
class UserUpdateDataSchema implements IUpdateUserDTO {
  @NameString()
  @Field({ description: "Your name." })
  name: string;

  @ValidString({ nullable: true })
  @IsPhoneNumber()
  @Field(() => String, {
    nullable: true,
    description: 'Phone number, e.g. "+55 99 9 9999 9999"; null clears it.',
  })
  phone_number?: string | null;

  @ValidString({ nullable: true })
  @IsLocale()
  @Field(() => String, {
    nullable: true,
    description: 'Preferred language, e.g. "pt-br".',
  })
  language?: string | null;

  @IsNullable()
  @IsBoolean()
  @Field(() => Boolean, {
    nullable: true,
    description: "Whether to receive notifications.",
  })
  notifications_enabled?: boolean | null | undefined;
}

@ArgsType()
class UserUpdateLearningDataSchema {
  @IsObject()
  @Field(() => JSONScalar, { description: "The learning data object (JSON)." })
  data: Record<string, any>;
}

export { UserUpdateDataSchema, UserUpdateLearningDataSchema };
