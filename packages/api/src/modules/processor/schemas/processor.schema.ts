import { plainToInstance, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsSemVer,
  IsString,
  ValidateNested,
} from "class-validator";
import { Field, InputType, Int } from "type-graphql";

// Decorator import
import { ValidInt } from "@shared/decorators/validInt.decorator";
import { ValidString } from "@shared/decorators/validString.decorator";

// Enum import
import { PROCESSOR_PARAMETER_TYPE } from "../types/processorParameterType.enum";
import { PROCESSOR_VISIBILITY } from "../types/processorVisibility.enum";

// DTO import
import {
  ICreateProcessorDTO,
  ProcessorForeignKeys,
} from "../types/IProcessor.dto";

// Entity import
import { ProcessorConfiguration } from "../entities/processorConfiguration.entity";
import { ProcessorParameter } from "../entities/processorParameter.entity";

@InputType()
class ProcessorConfigurationParameterSchema implements ProcessorParameter {
  @ValidInt()
  @Field(() => Int, {
    description: "Position of the parameter in the command line.",
  })
  sequence: number;

  @ValidString()
  @Field({ description: "Parameter name." })
  name: string;

  @ValidString()
  @Field({ description: "What the parameter does." })
  description: string;

  @ValidString()
  @IsEnum(PROCESSOR_PARAMETER_TYPE)
  @Field(() => PROCESSOR_PARAMETER_TYPE, {
    description: "Type of the parameter's value.",
  })
  type: PROCESSOR_PARAMETER_TYPE;

  @IsBoolean()
  @Field({ description: "Whether a run must give the parameter." })
  is_required: boolean;

  @ValidString({ nullable: "allowNull" })
  @Field(() => String, {
    nullable: true,
    description:
      "Value used when a run leaves the parameter out; null when there is none.",
  })
  default_value: string | null;
}

@InputType()
class ProcessorConfigurationSchema implements ProcessorConfiguration {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProcessorConfigurationParameterSchema)
  @Field(() => [ProcessorConfigurationParameterSchema], {
    description: "The parameters a run of it accepts.",
  })
  parameters: ProcessorConfigurationParameterSchema[];

  @ValidString()
  @Field({ description: "Argument name that receives the input dataset path." })
  dataset_input_argument: string;

  @ValidString()
  @Field({ description: "Input dataset path value." })
  dataset_input_value: string;

  @ValidString()
  @Field({ description: "Argument name that receives the output directory." })
  dataset_output_argument: string;

  @ValidString()
  @Field({ description: "Output directory value." })
  dataset_output_value: string;

  @ValidString()
  @Field({ description: "Command run inside the container." })
  command: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Type(() => String)
  @Field(() => [String], {
    description: "Glob patterns of the result files it produces.",
  })
  output_result_file_glob_patterns: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Type(() => String)
  @Field(() => [String], {
    description: "Glob patterns of the metrics files it produces.",
  })
  output_metrics_file_glob_patterns: string[];
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
  @Field({ description: "Processor name." })
  name: string;

  @ValidString()
  @IsSemVer()
  @Field({ description: "Semantic version, e.g. 1.2.0." })
  version: string;

  @ValidString()
  @Field({ description: "Container image tag to run." })
  image_tag: string;

  @ValidString({ nullable: "allowNull" })
  @Field(() => String, {
    nullable: true,
    description: "What the processor does; null when there is none.",
  })
  description: string | null;

  @ValidString({ nullable: "allowNull" })
  @Field(() => String, {
    nullable: true,
    description: "Comma-separated tags; null when there are none.",
  })
  tags: string | null;

  @ValidString()
  @Field({
    description: "Comma-separated MIME types of the datasets it accepts.",
  })
  allowed_mime_types: string;

  @ValidString()
  @IsEnum(PROCESSOR_VISIBILITY)
  @Field(() => PROCESSOR_VISIBILITY, { description: "Who can use it." })
  visibility: PROCESSOR_VISIBILITY;

  @IsObject()
  @ValidateNested()
  @Type(() => ProcessorConfigurationSchema)
  @Field(() => ProcessorConfigurationSchema, {
    description: "How the processor runs.",
  })
  configuration: ProcessorConfigurationSchema;

  static make(data: ProcessorSchema): ProcessorSchema {
    return plainToInstance(ProcessorSchema, data, { ignoreDecorators: true });
  }
}

export { ProcessorSchema, ProcessorConfigurationParameterSchema };
