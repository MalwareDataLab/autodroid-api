import { registerEnumType } from "type-graphql";

enum FILE_TYPE {
  DATASET = "DATASET",
  PROCESSING_RESULT = "PROCESSING_RESULT",
  PROCESSING_METRICS = "PROCESSING_METRICS",
}

registerEnumType(FILE_TYPE, {
  name: "FILE_TYPE",
});

export { FILE_TYPE };
