import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { addDays } from "date-fns";

// Configuration import
import { getGoogleStorageProviderConfig } from "@config/google";

// Repository import
import { IFileRepository } from "@modules/file/repositories/IFile.repository";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";

// DTO import
import { IGenerateUploadSignedUrlRequestParamsDTO } from "../../types/IUploadFile.dto";

// Provider import
import { GoogleStorageProvider } from "./googleStorage.provider";

const { StorageMock, storageInstanceMock, bucketMock, fileMock } = vi.hoisted(
  () => {
    const fileMockValue = {
      exists: vi.fn(),
      getSignedUrl: vi.fn(),
      delete: vi.fn(),
    };
    const bucketMockValue = {
      exists: vi.fn(),
      getMetadata: vi.fn(),
      setCorsConfiguration: vi.fn(),
      file: vi.fn(() => fileMockValue),
    };
    const storageInstanceMockValue = {
      bucket: vi.fn(() => bucketMockValue),
    };
    const StorageMockValue = vi.fn(() => storageInstanceMockValue);
    return {
      StorageMock: StorageMockValue,
      storageInstanceMock: storageInstanceMockValue,
      bucketMock: bucketMockValue,
      fileMock: fileMockValue,
    };
  },
);

vi.mock("@google-cloud/storage", () => ({
  Storage: StorageMock,
}));

vi.mock("@config/google", () => ({
  getGoogleStorageProviderConfig: vi.fn(),
}));

describe("Provider: GoogleStorageProvider", () => {
  const mockGetConfig = vi.mocked(getGoogleStorageProviderConfig);

  const validConfig = {
    project_id: "proj-id",
    client_email: "svc@proj.iam.gserviceaccount.com",
    bucket_name: "bucket-name",
    private_key: "-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----",
  };

  let fileRepositoryMock: Mocked<IFileRepository>;

  const buildProvider = async (): Promise<GoogleStorageProvider> => {
    const provider = new GoogleStorageProvider(fileRepositoryMock);
    await provider.initialization;
    return provider;
  };

  const buildUploadParams = (
    overrides: Partial<IGenerateUploadSignedUrlRequestParamsDTO> = {},
  ): IGenerateUploadSignedUrlRequestParamsDTO => ({
    filename: "data.csv",
    size: 1024,
    mimeType: MIME_TYPE.CSV,
    fileType: FILE_TYPE.DATASET,
    md5Hash: "aabbccdd",
    allowPublicAccess: true,
    cloudDirDestination: "datasets",
    user: null,
    language: "en",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue(validConfig);

    StorageMock.mockImplementation(() => storageInstanceMock);
    storageInstanceMock.bucket.mockImplementation(() => bucketMock);
    bucketMock.file.mockImplementation(() => fileMock);
    bucketMock.exists.mockResolvedValue([true]);
    bucketMock.getMetadata.mockResolvedValue([{ cors: [{ origin: ["*"] }] }]);
    bucketMock.setCorsConfiguration.mockResolvedValue(undefined);

    fileRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };
  });

  describe("initialization / getProvider", () => {
    it("should initialize the storage client with the mapped credentials", async () => {
      await buildProvider();

      expect(StorageMock).toHaveBeenCalledWith({
        projectId: validConfig.project_id,
        credentials: {
          client_email: validConfig.client_email,
          private_key: validConfig.private_key,
        },
      });
      expect(bucketMock.setCorsConfiguration).not.toHaveBeenCalled();
    });

    it("should configure cors when the bucket has no cors metadata", async () => {
      bucketMock.getMetadata.mockResolvedValue([{}]);

      await buildProvider();

      expect(bucketMock.setCorsConfiguration).toHaveBeenCalledOnce();
    });

    it("should configure cors when the cors array is empty", async () => {
      bucketMock.getMetadata.mockResolvedValue([{ cors: [] }]);

      await buildProvider();

      expect(bucketMock.setCorsConfiguration).toHaveBeenCalledOnce();
    });

    it("should configure cors when no origin allows all", async () => {
      bucketMock.getMetadata.mockResolvedValue([
        { cors: [{ origin: ["https://example.com"] }, {}] },
      ]);

      await buildProvider();

      expect(bucketMock.setCorsConfiguration).toHaveBeenCalledOnce();
    });

    it("should reuse the already-created client on subsequent calls", async () => {
      const provider = await buildProvider();
      const constructionCalls = StorageMock.mock.calls.length;

      fileMock.exists.mockResolvedValue([false]);

      await provider.removeFileByPath({ path: "some/path", language: "en" });

      expect(StorageMock.mock.calls.length).toBe(constructionCalls);
    });

    it("should throw BUCKET_NOT_FOUND when the bucket does not exist", async () => {
      bucketMock.exists.mockResolvedValue([false]);

      const provider = new GoogleStorageProvider(fileRepositoryMock);
      provider.initialization.catch(() => undefined);

      await expect(
        provider.removeFileByPath({ path: "some/path", language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_get_provider/BUCKET_NOT_FOUND",
        }),
      );
    });

    it("should throw INVALID_CONFIGURATION when project_id is missing", async () => {
      mockGetConfig.mockReturnValue({ ...validConfig, project_id: "" });

      const provider = new GoogleStorageProvider(fileRepositoryMock);
      provider.initialization.catch(() => undefined);

      await expect(
        provider.removeFileByPath({ path: "some/path", language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_get_provider/INVALID_CONFIGURATION",
        }),
      );
    });

    it("should throw INVALID_CONFIGURATION when client_email is missing", async () => {
      mockGetConfig.mockReturnValue({ ...validConfig, client_email: "" });

      const provider = new GoogleStorageProvider(fileRepositoryMock);
      provider.initialization.catch(() => undefined);

      await expect(
        provider.removeFileByPath({ path: "some/path", language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_get_provider/INVALID_CONFIGURATION",
        }),
      );
    });

    it("should throw INVALID_CONFIGURATION when private_key is missing", async () => {
      mockGetConfig.mockReturnValue({ ...validConfig, private_key: "" });

      const provider = new GoogleStorageProvider(fileRepositoryMock);
      provider.initialization.catch(() => undefined);

      await expect(
        provider.removeFileByPath({ path: "some/path", language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_get_provider/INVALID_CONFIGURATION",
        }),
      );
    });

    it("should throw INVALID_CONFIGURATION when bucket_name is missing", async () => {
      mockGetConfig.mockReturnValue({ ...validConfig, bucket_name: "" });

      const provider = new GoogleStorageProvider(fileRepositoryMock);
      provider.initialization.catch(() => undefined);

      await expect(
        provider.removeFileByPath({ path: "some/path", language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_get_provider/INVALID_CONFIGURATION",
        }),
      );
    });
  });

  describe("generateUploadSignedUrl", () => {
    it("should generate a signed upload url and persist the file", async () => {
      const provider = await buildProvider();

      fileMock.exists.mockResolvedValue([false]);
      fileMock.getSignedUrl.mockResolvedValue(["https://upload.url"]);
      const createdFile = fileFactory.build();
      fileRepositoryMock.createOne.mockResolvedValue(createdFile);

      const response = await provider.generateUploadSignedUrl(
        buildUploadParams({ agentInfo: undefined }),
      );

      expect(response).toBe(createdFile);
      expect(fileMock.getSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({ version: "v4", action: "write" }),
      );
      expect(fileRepositoryMock.createOne).toHaveBeenCalledWith(
        expect.objectContaining({
          storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
          provider_status: FILE_PROVIDER_STATUS.PENDING,
          type: FILE_TYPE.DATASET,
        }),
      );
    });

    it("should throw INVALID_CLOUD_DIRECTORY when destination is empty", async () => {
      const provider = await buildProvider();

      await expect(
        provider.generateUploadSignedUrl(
          buildUploadParams({ cloudDirDestination: "" }),
        ),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_generate_upload_signed_url/INVALID_CLOUD_DIRECTORY",
        }),
      );
    });

    it("should throw INVALID_CLOUD_DIRECTORY when destination contains a slash", async () => {
      const provider = await buildProvider();

      await expect(
        provider.generateUploadSignedUrl(
          buildUploadParams({ cloudDirDestination: "a/b" }),
        ),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_generate_upload_signed_url/INVALID_CLOUD_DIRECTORY",
        }),
      );
    });

    it("should throw INVALID_CLOUD_DIRECTORY when destination contains a backslash", async () => {
      const provider = await buildProvider();

      await expect(
        provider.generateUploadSignedUrl(
          buildUploadParams({ cloudDirDestination: "a\\b" }),
        ),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_generate_upload_signed_url/INVALID_CLOUD_DIRECTORY",
        }),
      );
    });

    it("should throw MISSING_FILENAME when filename is empty", async () => {
      const provider = await buildProvider();

      await expect(
        provider.generateUploadSignedUrl(buildUploadParams({ filename: "" })),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_generate_upload_signed_url/MISSING_FILENAME",
        }),
      );
    });

    it("should throw MISSING_EXTENSION when filename has no extension", async () => {
      const provider = await buildProvider();

      await expect(
        provider.generateUploadSignedUrl(
          buildUploadParams({ filename: "data" }),
        ),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_generate_upload_signed_url/MISSING_EXTENSION",
        }),
      );
    });

    it("should throw INVALID_MIME_TYPE when mime type is not supported", async () => {
      const provider = await buildProvider();

      await expect(
        provider.generateUploadSignedUrl(
          buildUploadParams({ mimeType: "invalid/type" as MIME_TYPE }),
        ),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_generate_upload_signed_url/INVALID_MIME_TYPE",
        }),
      );
    });

    it("should throw INVALID_MIME_TYPE_EXTENSION when extension mismatches mime type", async () => {
      const provider = await buildProvider();

      await expect(
        provider.generateUploadSignedUrl(
          buildUploadParams({ filename: "data.png", mimeType: MIME_TYPE.CSV }),
        ),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_generate_upload_signed_url/INVALID_MIME_TYPE_EXTENSION",
        }),
      );
    });

    it("should throw INVALID_FILE_TYPE when file type is not supported", async () => {
      const provider = await buildProvider();

      await expect(
        provider.generateUploadSignedUrl(
          buildUploadParams({ fileType: "INVALID" as FILE_TYPE }),
        ),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_generate_upload_signed_url/INVALID_FILE_TYPE",
        }),
      );
    });

    it("should throw FILE_ALREADY_EXISTS when the destination file exists", async () => {
      const provider = await buildProvider();

      fileMock.exists.mockResolvedValue([true]);

      await expect(
        provider.generateUploadSignedUrl(buildUploadParams()),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_generate_upload_signed_url/FILE_ALREADY_EXISTS",
        }),
      );
    });

    it("should wrap unexpected errors in ERROR", async () => {
      const provider = await buildProvider();

      fileMock.exists.mockResolvedValue([false]);
      fileMock.getSignedUrl.mockRejectedValue(new Error("boom"));

      await expect(
        provider.generateUploadSignedUrl(buildUploadParams()),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_generate_upload_signed_url/ERROR",
        }),
      );
    });
  });

  describe("refreshFile", () => {
    const buildFile = (overrides: Partial<File> = {}): File =>
      fileFactory.build({
        storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
        allow_public_access: true,
        upload_url: null,
        upload_url_expires_at: null,
        public_url: null,
        public_url_expires_at: null,
        provider_path: "test/datasets/file.csv",
        ...overrides,
      });

    it("should throw INVALID_STORAGE_PROVIDER when the provider mismatches", async () => {
      const provider = await buildProvider();

      const file = buildFile({
        storage_provider: "OTHER_PROVIDER" as STORAGE_PROVIDER,
      });

      await expect(
        provider.refreshFile({ file, language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_refresh_file/INVALID_STORAGE_PROVIDER",
        }),
      );
    });

    it("should return the file untouched when public access is disabled", async () => {
      const provider = await buildProvider();

      const file = buildFile({ allow_public_access: false });

      const response = await provider.refreshFile({ file, language: "en" });

      expect(response).toBe(file);
      expect(fileRepositoryMock.updateOne).not.toHaveBeenCalled();
    });

    it("should return the file when the public url is still valid", async () => {
      const provider = await buildProvider();

      const file = buildFile({
        public_url: "https://public.url",
        public_url_expires_at: addDays(new Date(), 2),
      });

      const response = await provider.refreshFile({ file });

      expect(response).toBe(file);
      expect(fileMock.exists).not.toHaveBeenCalled();
    });

    it("should throw INVALID_EXPIRATION_DATE when the custom date is in the past", async () => {
      const provider = await buildProvider();

      const file = buildFile();

      await expect(
        provider.refreshFile({
          file,
          customPublicUrlExpirationDate: addDays(new Date(), -1),
          language: "en",
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_update_public_url/INVALID_EXPIRATION_DATE",
        }),
      );
    });

    it("should throw INVALID_EXPIRATION_DATE when the custom date exceeds seven days", async () => {
      const provider = await buildProvider();

      const file = buildFile();

      await expect(
        provider.refreshFile({
          file,
          customPublicUrlExpirationDate: addDays(new Date(), 8),
          language: "en",
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_update_public_url/INVALID_EXPIRATION_DATE",
        }),
      );
    });

    it("should mark the file pending when the upload process is still open", async () => {
      const provider = await buildProvider();

      const file = buildFile({
        upload_url: "https://upload.url",
        upload_url_expires_at: addDays(new Date(), 1),
      });
      fileMock.exists.mockResolvedValue([false]);
      const updatedFile = fileFactory.build();
      fileRepositoryMock.updateOne.mockResolvedValue(updatedFile);

      const response = await provider.refreshFile({ file, language: "en" });

      expect(response).toBe(updatedFile);
      expect(fileRepositoryMock.updateOne).toHaveBeenCalledWith(
        { id: file.id },
        expect.objectContaining({
          provider_status: FILE_PROVIDER_STATUS.PENDING,
        }),
      );
    });

    it("should error when the pending update returns no file", async () => {
      const provider = await buildProvider();

      const file = buildFile({
        upload_url: "https://upload.url",
        upload_url_expires_at: addDays(new Date(), 1),
      });
      fileMock.exists.mockResolvedValue([false]);
      fileRepositoryMock.updateOne.mockResolvedValue(null);

      await expect(
        provider.refreshFile({ file, language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_update_public_url/ERROR",
        }),
      );
    });

    it("should mark the file not found when the upload process expired", async () => {
      const provider = await buildProvider();

      const file = buildFile({
        upload_url: "https://upload.url",
        upload_url_expires_at: addDays(new Date(), -1),
      });
      fileMock.exists.mockResolvedValue([false]);
      const updatedFile = fileFactory.build();
      fileRepositoryMock.updateOne.mockResolvedValue(updatedFile);

      const response = await provider.refreshFile({ file, language: "en" });

      expect(response).toBe(updatedFile);
      expect(fileRepositoryMock.updateOne).toHaveBeenCalledWith(
        { id: file.id },
        expect.objectContaining({
          provider_status: FILE_PROVIDER_STATUS.NOT_FOUND,
        }),
      );
    });

    it("should error when the not-found update returns no file", async () => {
      const provider = await buildProvider();

      const file = buildFile();
      fileMock.exists.mockResolvedValue([false]);
      fileRepositoryMock.updateOne.mockResolvedValue(null);

      await expect(
        provider.refreshFile({ file, language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_update_public_url/ERROR",
        }),
      );
    });

    it("should generate a public read url with the default expiration", async () => {
      const provider = await buildProvider();

      const file = buildFile();
      fileMock.exists.mockResolvedValue([true]);
      fileMock.getSignedUrl.mockResolvedValue(["https://read.url"]);
      const updatedFile = fileFactory.build();
      fileRepositoryMock.updateOne.mockResolvedValue(updatedFile);

      const response = await provider.refreshFile({ file, language: "en" });

      expect(response).toBe(updatedFile);
      expect(fileMock.getSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({ version: "v4", action: "read" }),
      );
      expect(fileRepositoryMock.updateOne).toHaveBeenCalledWith(
        { id: file.id },
        expect.objectContaining({
          provider_status: FILE_PROVIDER_STATUS.READY,
        }),
      );
    });

    it("should generate a public read url with a custom expiration", async () => {
      const provider = await buildProvider();

      const file = buildFile();
      const customPublicUrlExpirationDate = addDays(new Date(), 1);
      fileMock.exists.mockResolvedValue([true]);
      fileMock.getSignedUrl.mockResolvedValue(["https://read.url"]);
      const updatedFile = fileFactory.build();
      fileRepositoryMock.updateOne.mockResolvedValue(updatedFile);

      const response = await provider.refreshFile({
        file,
        customPublicUrlExpirationDate,
        language: "en",
      });

      expect(response).toBe(updatedFile);
      expect(fileMock.getSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({ expires: customPublicUrlExpirationDate }),
      );
    });

    it("should error when the ready update returns no file", async () => {
      const provider = await buildProvider();

      const file = buildFile();
      fileMock.exists.mockResolvedValue([true]);
      fileMock.getSignedUrl.mockResolvedValue(["https://read.url"]);
      fileRepositoryMock.updateOne.mockResolvedValue(null);

      await expect(
        provider.refreshFile({ file, language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_update_public_url/ERROR",
        }),
      );
    });

    it("should wrap unexpected errors in ERROR", async () => {
      const provider = await buildProvider();

      const file = buildFile();
      fileMock.exists.mockRejectedValue(new Error("boom"));

      await expect(
        provider.refreshFile({ file, language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_update_public_url/ERROR",
        }),
      );
    });
  });

  describe("removeFileByPath", () => {
    it("should delete the cloud file and its registry entry", async () => {
      const provider = await buildProvider();

      fileMock.exists.mockResolvedValue([true]);
      fileMock.delete.mockResolvedValue(undefined);
      const registry = fileFactory.build();
      fileRepositoryMock.findOne.mockResolvedValue(registry);
      fileRepositoryMock.deleteOne.mockResolvedValue(registry);

      const response = await provider.removeFileByPath({
        path: "test/datasets/file.csv",
        language: "en",
      });

      expect(response).toBe("test/datasets/file.csv");
      expect(fileMock.delete).toHaveBeenCalledOnce();
      expect(fileRepositoryMock.deleteOne).toHaveBeenCalledWith({
        id: registry.id,
      });
    });

    it("should skip deletion when the cloud file does not exist", async () => {
      const provider = await buildProvider();

      fileMock.exists.mockResolvedValue([false]);
      fileRepositoryMock.findOne.mockResolvedValue(null);

      const response = await provider.removeFileByPath({
        path: "test/datasets/file.csv",
        language: "en",
      });

      expect(response).toBe("test/datasets/file.csv");
      expect(fileMock.delete).not.toHaveBeenCalled();
      expect(fileRepositoryMock.deleteOne).not.toHaveBeenCalled();
    });

    it("should tolerate a failing registry deletion", async () => {
      const provider = await buildProvider();

      fileMock.exists.mockResolvedValue([false]);
      const registry = fileFactory.build();
      fileRepositoryMock.findOne.mockResolvedValue(registry);
      fileRepositoryMock.deleteOne.mockRejectedValue(new Error("boom"));

      const response = await provider.removeFileByPath({
        path: "test/datasets/file.csv",
        language: "en",
      });

      await new Promise<void>(resolve => {
        setImmediate(resolve);
      });

      expect(response).toBe("test/datasets/file.csv");
    });

    it("should throw MISSING_PATH when the path is empty", async () => {
      const provider = await buildProvider();

      await expect(
        provider.removeFileByPath({ path: "", language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_remove_file_by_path/MISSING_PATH",
        }),
      );
    });

    it("should wrap unexpected errors in ERROR", async () => {
      const provider = await buildProvider();

      fileMock.exists.mockRejectedValue(new Error("boom"));

      await expect(
        provider.removeFileByPath({
          path: "test/datasets/file.csv",
          language: "en",
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@google_storage_provider_remove_file_by_path/ERROR",
        }),
      );
    });
  });
});
