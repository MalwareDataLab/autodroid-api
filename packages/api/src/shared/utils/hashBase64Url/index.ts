import { createHash } from "node:crypto";

export const hashBase64Url = (value: string): string =>
  createHash("sha256").update(value).digest("base64url");
