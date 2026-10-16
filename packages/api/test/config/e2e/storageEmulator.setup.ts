import { inject } from "vitest";

const storageEmulator = inject("storageEmulator");

process.env.STORAGE_EMULATOR_HOST = storageEmulator.host;
process.env.GOOGLE_STORAGE_PROVIDER_PROJECT_ID = storageEmulator.projectId;
process.env.GOOGLE_STORAGE_PROVIDER_CLIENT_EMAIL = storageEmulator.clientEmail;
process.env.GOOGLE_STORAGE_PROVIDER_PRIVATE_KEY = storageEmulator.privateKey;
process.env.GOOGLE_STORAGE_PROVIDER_BUCKET_NAME = storageEmulator.bucketName;
