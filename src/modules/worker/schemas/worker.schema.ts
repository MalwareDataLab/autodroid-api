import { IsBoolean, IsUUID } from "class-validator";
import { ArgsType, Field } from "type-graphql";
import { plainToInstance } from "class-transformer";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";
import { IsNullable } from "@shared/decorators/isNullable.decorator";

// DTO import
import { IFindWorkerDTO } from "../types/IWorker.dto";

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
  archived?: boolean;

  static make(data: WorkerIndexSchema) {
    return plainToInstance(WorkerIndexSchema, data);
  }
}

export { WorkerIndexSchema };
