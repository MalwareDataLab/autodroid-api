import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Entity import
import { User } from "../entities/user.entity";

// Repository import
import { IUserRepository } from "../repositories/IUser.repository";

// Schema import
import { UserUpdateLearningDataSchema } from "../schemas/userUpdateData.schema";

interface IRequest {
  user: User;

  params: UserUpdateLearningDataSchema;

  language: string;
}

@injectable()
class UserUpdateLearningDataService {
  constructor(
    @inject("UserRepository")
    private userRepository: IUserRepository,
  ) {}

  public async execute({ user, params, language }: IRequest): Promise<User> {
    const t = await i18n(language);

    const updatedUser = await this.userRepository.updateOne(
      { id: user.id },
      { learning_data: params.data },
    );

    if (!updatedUser)
      throw new AppError({
        key: "@user_update_learning_data_service/USER_NOT_FOUND_AFTER_UPDATE",
        message: t(
          "@user_update_learning_data_service/USER_NOT_FOUND_AFTER_UPDATE",
          "User not found.",
        ),
        debug: { user },
      });

    return updatedUser;
  }
}

export { UserUpdateLearningDataService };
