import { container } from "tsyringe";
import { vi } from "vitest";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

const setupGlobalMocks = () => {
  container.registerInstance<IStorageProvider>("StorageProvider", {
    provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
    initialization: Promise.resolve(),
    generateUploadSignedUrl: vi.fn(() => {
      throw new Error("Not implemented.");
    }),
    refreshFile: vi.fn(({ file }) => file),
    removeFileByPath: vi.fn(),
  });
};

export { setupGlobalMocks };
