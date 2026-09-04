import { Arg } from "type-graphql";

// Schema import
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

// Util import
import { validateSorting } from "@modules/sorting/utils/validateSorting.util";

export function SortingArg<T>(
  fields: ReadonlyArray<keyof T>,
  { nullable = true }: { nullable?: boolean } = {},
) {
  return (target: any, key: string, descriptor: number) => {
    Arg("sorting", () => [SortingFieldSchema], {
      nullable,
      validateFn: (value?: any) =>
        validateSorting<T>({
          value,
          allowed: fields,
          nullable: { nullable },
        }),
    })(target, key, descriptor);
  };
}
