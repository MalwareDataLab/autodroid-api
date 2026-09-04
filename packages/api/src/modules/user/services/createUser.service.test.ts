import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Repository import
import { IUserRepository } from "@shared/container/repositories";

// DTO import
import { ICreateUserDTO } from "../types/IUser.dto";

// Service import
import { CreateUserService } from "./createUser.service";

describe("Service: CreateUserService", () => {
  let userRepository: IUserRepository;

  let createUserService: CreateUserService;

  beforeEach(() => {
    userRepository = container.resolve("UserRepository");
    createUserService = new CreateUserService(userRepository);
  });

  it("should create a user", async () => {
    const data: ICreateUserDTO = {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      language: "en",
      phone_number: faker.phone.number(),
      learning_data: {},
      notifications_enabled: true,
    };

    const response = await createUserService.execute({
      data,
      language: "en",
    });

    expect(response).toMatchObject(data);

    const found = await userRepository.findOne({ id: response.id });
    expect(found?.email).toBe(data.email);
  });

  it("should throw an error in case of creation failure", async () => {
    const data: ICreateUserDTO = {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      language: "en",
      phone_number: faker.phone.number(),
      learning_data: {},
      notifications_enabled: true,
    };

    await userRepository.createOne(data);

    await expect(
      createUserService.execute({
        data,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@create_user_service/FAIL_TO_CREATE_USER",
      }),
    );
  });
});
