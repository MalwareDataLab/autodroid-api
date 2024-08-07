import { registerEnumType } from "type-graphql";

enum FILE_TYPE {
  DATASET = "DATASET",
}

registerEnumType(FILE_TYPE, {
  name: "FILE_TYPE",
});

export { FILE_TYPE };
