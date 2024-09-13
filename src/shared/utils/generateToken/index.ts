import { customAlphabet } from "nanoid";

export const generateToken = (length: number = 32): string => {
  return customAlphabet(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    length,
  )();
};
