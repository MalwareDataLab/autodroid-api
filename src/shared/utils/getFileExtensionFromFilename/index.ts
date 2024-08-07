import { extname } from "node:path";

const getFileExtensionFromFilename = (filename: string): string => {
  const extension = extname(filename).split(".").slice(1).join(".");
  return extension;
};

export { getFileExtensionFromFilename };
