import { registerEnumType } from "type-graphql";

enum DATASET_VISIBILITY {
  PRIVATE = "PRIVATE",
  PUBLIC = "PUBLIC",
  UNDER_REVIEW = "UNDER_REVIEW",
}

registerEnumType(DATASET_VISIBILITY, {
  name: "DATASET_VISIBILITY",
});

export { DATASET_VISIBILITY };
