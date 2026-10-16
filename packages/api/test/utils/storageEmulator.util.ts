import { randomUUID } from "node:crypto";
import { inject } from "vitest";

export const generateStorageEmulatorPath = (cloudDirectory: string) =>
  `test/${cloudDirectory}/${randomUUID()}.csv`;

export const putStorageEmulatorObject = async (path: string) => {
  const { host, bucketName } = inject("storageEmulator");
  const uploadUrl = new URL(
    `/upload/storage/v1/b/${bucketName}/o`,
    new URL(host).origin,
  );
  uploadUrl.searchParams.set("uploadType", "media");
  uploadUrl.searchParams.set("name", path);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "content-type": "text/csv" },
    body: "column\nvalue\n",
  });

  if (!response.ok)
    throw new Error(
      `Storage emulator upload failed: ${response.status} ${await response.text()}`,
    );
};

export const getStorageEmulatorObjectStatus = async (path: string) => {
  const { host, bucketName } = inject("storageEmulator");

  const response = await fetch(
    `${host}/b/${bucketName}/o/${encodeURIComponent(path)}`,
  );

  return response.status;
};

export const getStorageEmulatorSignedUrlTarget = (path: string) => {
  const { host, bucketName } = inject("storageEmulator");

  return `${new URL(host).origin}/${bucketName}/${path}`;
};
