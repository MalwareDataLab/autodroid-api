import { ArgsType, Field } from "type-graphql";
import { IsDate, MaxDate, MinDate } from "class-validator";

// Helper import
import { DateUtils } from "@shared/utils/dateUtils";
import { Type } from "class-transformer";

@ArgsType()
class UserProcessingExtendKeepUntilSchema {
  @IsDate()
  @MinDate(() => new Date(), {
    message: "The date must be greater than or equal to the current date",
  })
  @MaxDate(() => DateUtils.now().add(30, "days").toDate(), {
    message: "The date must be less than or equal to 30 days from now",
  })
  @Type(() => Date)
  @Field(() => Date)
  keep_until: Date;
}

export { UserProcessingExtendKeepUntilSchema };
