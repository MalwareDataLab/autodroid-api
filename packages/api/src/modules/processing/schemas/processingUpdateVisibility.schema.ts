import { IsEnum } from "class-validator";
import { ArgsType, Field } from "type-graphql";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

// Enum import
import { PROCESSING_VISIBILITY } from "../types/processingVisibility.enum";

@ArgsType()
class ProcessingUpdateVisibilitySchema {
  @ValidString()
  @IsEnum(PROCESSING_VISIBILITY)
  @Field(() => PROCESSING_VISIBILITY, { description: "The new visibility." })
  visibility: PROCESSING_VISIBILITY;
}

export { ProcessingUpdateVisibilitySchema };
