import { Field, InputType, Int } from "type-graphql";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsSemVer,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

// DTO import
import { ValidInt } from "@shared/decorators/validInt.decorator";
import {
  ICreateProcessorDTO,
  ProcessorForeignKeys,
} from "../types/IProcessor.dto";

// Entity import
import { ProcessorConfiguration } from "../entities/processorConfiguration.entity";
import { ProcessorParameter } from "../entities/processorParameter.entity";

// Enum import
import { PROCESSOR_VISIBILITY } from "../types/processorVisibility.enum";
import { PROCESSOR_PARAMETER_TYPE } from "../types/processorParameterType.enum";

@InputType()
class ProcessorConfigurationParameterSchema implements ProcessorParameter {
  @ValidInt()
  @Field(() => Int)
  sequence: number;

  @ValidString()
  @Field()
  name: string;

  @ValidString()
  @Field()
  description: string;

  @ValidString()
  @IsEnum(PROCESSOR_PARAMETER_TYPE)
  @Field(() => PROCESSOR_PARAMETER_TYPE)
  type: PROCESSOR_PARAMETER_TYPE;

  @IsBoolean()
  @Field()
  is_required: boolean;

  @ValidString({ nullable: "allowNull" })
  @Field(() => String, { nullable: true })
  default_value: string | null;
}

@InputType()
class ProcessorConfigurationSchema implements ProcessorConfiguration {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested()
  @Type(() => ProcessorConfigurationParameterSchema)
  @Field(() => [ProcessorConfigurationParameterSchema])
  parameters: ProcessorConfigurationParameterSchema[];

  @ValidString()
  @Field()
  dataset_input_argument: string;

  @ValidString()
  @Field()
  dataset_input_value: string;

  @ValidString()
  @Field()
  dataset_output_argument: string;

  @ValidString()
  @Field()
  dataset_output_value: string;

  @ValidString()
  @Field()
  command: string;
}

@InputType()
class ProcessorSchema
  implements
    Omit<
      ICreateProcessorDTO,
      ProcessorForeignKeys | "payload" | "configuration"
    >
{
  @ValidString()
  @Field()
  name: string;

  @ValidString()
  @IsSemVer()
  @Field()
  version: string;

  @ValidString()
  @Field()
  image_tag: string;

  @ValidString({ nullable: "allowNull" })
  @Field(() => String, { nullable: true })
  description: string | null;

  @ValidString({ nullable: "allowNull" })
  @Field(() => String, { nullable: true })
  tags: string | null;

  @ValidString()
  @Field()
  allowed_mime_types: string;

  @ValidString()
  @IsEnum(PROCESSOR_VISIBILITY)
  @Field(() => PROCESSOR_VISIBILITY)
  visibility: PROCESSOR_VISIBILITY;

  @IsObject()
  @ValidateNested()
  @Type(() => ProcessorConfigurationSchema)
  @Field(() => ProcessorConfigurationSchema)
  configuration: ProcessorConfigurationSchema;
}

export { ProcessorSchema, ProcessorConfigurationParameterSchema };
