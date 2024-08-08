import { registerEnumType } from "type-graphql";

enum PROCESSOR_PARAM_TYPE {
  STRING = "STRING",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
}

registerEnumType(PROCESSOR_PARAM_TYPE, {
  name: "PROCESSOR_PARAM_TYPE",
});

export { PROCESSOR_PARAM_TYPE };
