import { faker } from "@faker-js/faker";

const generateEntityBaseData = () => {
  const created_at = faker.date.past();

  return {
    id: crypto.randomUUID(),
    created_at,
    updated_at: faker.date.between({
      from: created_at,
      to: new Date(),
    }),
  };
};

export { generateEntityBaseData };
