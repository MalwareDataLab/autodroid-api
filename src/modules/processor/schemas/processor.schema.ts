import { Field, InputType, Int } from "type-graphql";
import {
  ArrayMinSize,
  IsArray,
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
import { ProcessorPayload } from "../entities/processorPayload.entity";

// Enum import
import { PROCESSOR_VISIBILITY } from "../types/processorVisibility.enum";
import { ProcessorParam } from "../entities/processorParam.entity";
import { PROCESSOR_PARAM_TYPE } from "../types/processorParamType.enum";

@InputType()
class ProcessorPayloadParamSchema implements ProcessorParam {
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
  @IsEnum(PROCESSOR_PARAM_TYPE)
  @Field(() => PROCESSOR_PARAM_TYPE)
  type: PROCESSOR_PARAM_TYPE;

  @ValidString({ nullable: "allowNull" })
  @Field(() => String, { nullable: true })
  default_value: string | null;
}

@InputType()
class ProcessorPayloadSchema implements ProcessorPayload {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested()
  @Type(() => ProcessorPayloadParamSchema)
  @Field(() => [ProcessorPayloadParamSchema])
  params: ProcessorPayloadParamSchema[];

  @ValidInt()
  @Field(() => Int)
  required_ram_mb: number;

  @ValidInt()
  @Field(() => Int)
  required_cpu_cores: number;
}

@InputType()
class ProcessorSchema
  implements Omit<ICreateProcessorDTO, ProcessorForeignKeys | "payload">
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
  @Type(() => ProcessorPayloadSchema)
  @Field(() => ProcessorPayloadSchema)
  payload: ProcessorPayloadSchema;
}

export { ProcessorSchema };
