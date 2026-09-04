import { plainToInstance } from "class-transformer";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";
import { Factory } from "fishery";

// Util import

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Type import
import { FactoryParams } from "@/test/types/factoryParams.type";
import { generateEntityBaseData } from "@/test/utils/generateEntityBaseData.util";
import { getBaseFactoryEntityData } from "@/test/utils/getBaseFactoryEntityData.util";
import { IUserBase } from "../../types/IUser.dto";

class UserFactory extends Factory<User, FactoryParams> {
  static get repository() {
    return container.resolve("UserRepository");
  }
}

const userFactory = UserFactory.define(({ onCreate, associations }) => {
  const base: IUserBase = {
    /** Base */
    ...generateEntityBaseData(),

    /** Entity */
    email: faker.internet.email(),
    name: faker.person.firstName(),
    phone_number: faker.phone.number(),
    learning_data: {},
    language: "en",
    notifications_enabled: true,

    /** Simulated */

    /** Relations */
  };

  onCreate(item => {
    return UserFactory.repository.createOne(
      getBaseFactoryEntityData({ base, item }),
    );
  });

  return plainToInstance(User, {
    ...base,
    ...associations,
  });
});

export { userFactory };
