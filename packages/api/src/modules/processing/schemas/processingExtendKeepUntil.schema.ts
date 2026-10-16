import { Type } from "class-transformer";
import { IsDate, MaxDate, MinDate } from "class-validator";
import { ArgsType, Field } from "type-graphql";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";

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
  @Field(() => Date, {
    description:
      "The new keep-until moment, from now up to 30 days ahead (e.g. 2030-01-31T00:00:00Z).",
  })
  keep_until: Date;
}

export { UserProcessingExtendKeepUntilSchema };
