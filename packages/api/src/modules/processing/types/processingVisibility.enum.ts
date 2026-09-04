import { registerEnumType } from "type-graphql";

enum PROCESSING_VISIBILITY {
  PRIVATE = "PRIVATE",
  PUBLIC = "PUBLIC",
}

registerEnumType(PROCESSING_VISIBILITY, {
  name: "PROCESSING_VISIBILITY",
});

export { PROCESSING_VISIBILITY };
