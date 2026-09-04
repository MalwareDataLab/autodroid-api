// Interface import
import { GoogleStorageProvider } from "./implementations/google/googleStorage.provider";

const providers = {
  google: GoogleStorageProvider,
};

const StorageProvider = providers.google;

export { StorageProvider };
