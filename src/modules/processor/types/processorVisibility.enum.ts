import { registerEnumType } from "type-graphql";

enum PROCESSOR_VISIBILITY {
  HIDDEN = "HIDDEN",
  PUBLIC = "PUBLIC",
}

registerEnumType(PROCESSOR_VISIBILITY, {
  name: "PROCESSOR_VISIBILITY",
});

export { PROCESSOR_VISIBILITY };
