import { faker } from "@faker-js/faker";
import { plainToInstance } from "class-transformer";
import { Factory } from "fishery";
import { container } from "tsyringe";

// Util import
import { generateEntityBaseData } from "@/test/utils/generateEntityBaseData.util";
import { getBaseFactoryEntityData } from "@/test/utils/getBaseFactoryEntityData.util";

// Type import
import { FactoryParams } from "@/test/types/factoryParams.type";

// DTO import
import { IUserBase } from "../../types/IUser.dto";

// Entity import
import { User } from "@modules/user/entities/user.entity";

class UserFactory extends Factory<User, FactoryParams> {
  static get repository() {
    return container.resolve("UserRepository");
  }
}

const userFactory = UserFactory.define(
  ({ onCreate, associations, sequence }) => {
    const base: IUserBase = {
      /** Base */
      ...generateEntityBaseData(),

      /** Entity */
      email: `user${sequence}.${faker.internet.email()}`,
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
  },
);

export { userFactory };
