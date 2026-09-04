import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";

// Enum import
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Provider import
import { GoogleStorageProvider } from "./googleStorage.provider";

describe("External: GoogleStorageProvider", () => {
  const payload = `id,label\n1,${randomUUID()}\n`;

  let provider: GoogleStorageProvider;
  let uploadedFile: File | undefined;

  const generateUploadSignedUrl = () =>
    provider.generateUploadSignedUrl({
      filename: `${randomUUID()}.csv`,
      size: Buffer.byteLength(payload),
      mimeType: MIME_TYPE.CSV,
      fileType: FILE_TYPE.DATASET,
      md5Hash: createHash("md5").update(payload).digest("hex"),
      allowPublicAccess: true,
      cloudDirDestination: "datasets",
      user: null,
      language: "en",
    });

  beforeEach(async context => {
    provider = new GoogleStorageProvider(context.repositories.FileRepository);
    await provider.initialization;
    uploadedFile = undefined;
  });

  afterEach(async () => {
    if (!uploadedFile) return;
    await provider.removeFileByPath({
      path: uploadedFile.provider_path,
      language: "en",
    });
  });

  it("should reach the configured bucket during initialization", async () => {
    await expect(provider.initialization).resolves.toBeUndefined();
  });

  it("should issue an upload url the bucket actually accepts", async () => {
    uploadedFile = await generateUploadSignedUrl();

    expect(uploadedFile.provider_path).toMatch(/^test\/datasets\/.+\.csv$/);
    expect(uploadedFile.provider_status).toBe(FILE_PROVIDER_STATUS.PENDING);

    const upload = await fetch(uploadedFile.upload_url!, {
      method: "PUT",
      headers: { "Content-Type": MIME_TYPE.CSV },
      body: payload,
    });

    expect(upload.status).toBe(200);
  });

  it("should publish a readable url for an object present in the bucket", async () => {
    uploadedFile = await generateUploadSignedUrl();

    await fetch(uploadedFile.upload_url!, {
      method: "PUT",
      headers: { "Content-Type": MIME_TYPE.CSV },
      body: payload,
    });

    const refreshed = await provider.refreshFile({
      file: uploadedFile,
      language: "en",
    });

    expect(refreshed.provider_status).toBe(FILE_PROVIDER_STATUS.READY);
    expect(refreshed.upload_url).toBeNull();

    const download = await fetch(refreshed.public_url!);

    expect(download.status).toBe(200);
    await expect(download.text()).resolves.toBe(payload);
  });

  it("should mark a file as not found when the object was never uploaded", async () => {
    const file = await generateUploadSignedUrl();

    const refreshed = await provider.refreshFile({
      file: {
        ...file,
        upload_url: null,
        upload_url_expires_at: null,
      } as File,
      language: "en",
    });

    expect(refreshed.provider_status).toBe(FILE_PROVIDER_STATUS.NOT_FOUND);
    expect(refreshed.public_url).toBeNull();
  });

  it("should remove an uploaded object from the bucket", async () => {
    const file = await generateUploadSignedUrl();

    await fetch(file.upload_url!, {
      method: "PUT",
      headers: { "Content-Type": MIME_TYPE.CSV },
      body: payload,
    });

    await provider.removeFileByPath({
      path: file.provider_path,
      language: "en",
    });

    const refreshed = await provider.refreshFile({
      file: { ...file, upload_url: null, upload_url_expires_at: null } as File,
      language: "en",
    });

    expect(refreshed.provider_status).toBe(FILE_PROVIDER_STATUS.NOT_FOUND);
  });
});
