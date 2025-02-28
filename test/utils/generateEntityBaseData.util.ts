import crypto from "node:crypto";
import { faker } from "@faker-js/faker";

// Constant import
import { MAX_SAFE_BIGINT } from "@shared/constants/maxSafeBigInt.constant";

const generateEntityBaseData = () => {
  const created_at = faker.date.past();

  return {
    id: crypto.randomUUID(),
    seq: faker.number.bigInt({ min: 1, max: MAX_SAFE_BIGINT }),
    created_at,
    updated_at: faker.date.between({
      from: created_at,
      to: new Date(),
    }),
  };
};

export { generateEntityBaseData };
