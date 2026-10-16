import { registerEnumType } from "type-graphql";

enum STORAGE_PROVIDER {
  GOOGLE_CLOUD_STORAGE = "GOOGLE_CLOUD_STORAGE",
}

registerEnumType(STORAGE_PROVIDER, {
  name: "STORAGE_PROVIDER",
});

export { STORAGE_PROVIDER };
