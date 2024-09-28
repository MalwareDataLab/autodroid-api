import { registerEnumType } from "type-graphql";

enum FILE_TYPE {
  DATASET = "DATASET",
  PROCESSING = "PROCESSING",
}

registerEnumType(FILE_TYPE, {
  name: "FILE_TYPE",
});

export { FILE_TYPE };
