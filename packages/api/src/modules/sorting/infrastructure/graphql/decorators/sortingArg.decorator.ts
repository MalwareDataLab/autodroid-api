import { Arg } from "type-graphql";

// Util import
import {
  MAX_SORTING_ARGS,
  validateSorting,
} from "@modules/sorting/utils/validateSorting.util";

// Schema import
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

export function SortingArg<T>(
  fields: ReadonlyArray<keyof T>,
  { nullable = true }: { nullable?: boolean } = {},
) {
  return (target: any, key: string, descriptor: number) => {
    Arg("sorting", () => [SortingFieldSchema], {
      nullable,
      description: `How to sort, the first entry first, in up to ${MAX_SORTING_ARGS} entries over the fields ${fields.join(", ")}; newest first when omitted. E.g. [{"field":"created_at","order":"ASC"}].`,
      validateFn: (value?: any) =>
        validateSorting<T>({
          value,
          allowed: fields,
          nullable: { nullable },
        }),
    })(target, key, descriptor);
  };
}
