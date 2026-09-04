import { registerEnumType } from "type-graphql";

enum PROCESSOR_PARAMETER_TYPE {
  STRING = "STRING",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
}

registerEnumType(PROCESSOR_PARAMETER_TYPE, {
  name: "PROCESSOR_PARAMETER_TYPE",
});

export { PROCESSOR_PARAMETER_TYPE };
