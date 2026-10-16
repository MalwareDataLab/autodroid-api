import crypto, { randomUUID } from "node:crypto";

const generateRandomFilename = (filename: string) =>
  `${Date.now()}-${randomUUID()}-${crypto
    .randomBytes(64)
    .toString("hex")}-${filename}`;

export { generateRandomFilename };
