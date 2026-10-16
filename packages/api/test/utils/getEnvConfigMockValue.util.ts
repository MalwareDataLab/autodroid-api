// Configuration import
import type { getEnvConfig } from "@config/env";

type EnvConfig = ReturnType<typeof getEnvConfig>;

type WithoutIndexSignature<SOURCE> = {
  [KEY in keyof SOURCE as string extends KEY
    ? never
    : number extends KEY
      ? never
      : KEY]: SOURCE[KEY];
};

type EnvConfigMockValues = Partial<WithoutIndexSignature<EnvConfig>> & {
  [key: string]: unknown;
};

const getEnvConfigMockValue = (values: EnvConfigMockValues): EnvConfig =>
  values as EnvConfig;

export { getEnvConfigMockValue };
