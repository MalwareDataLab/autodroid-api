import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Entity import
import { User } from "../entities/user.entity";

// Repository import
import { IUserRepository } from "../repositories/IUser.repository";

// DTO import
import { ICreateUserDTO } from "../types/IUser.dto";

// Service import
import { CreateUserService } from "./createUser.service";

describe("Service: CreateUserService", () => {
  let userRepositoryMock: Mocked<IUserRepository>;

  let createUserService: CreateUserService;

  beforeEach(() => {
    userRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };
    createUserService = new CreateUserService(userRepositoryMock);
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

    userRepositoryMock.createOne.mockResolvedValueOnce(parse(User, data));

    const response = await createUserService.execute({
      data,
      language: "en",
    });

    expect(response).toEqual(data);
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

    userRepositoryMock.createOne.mockRejectedValueOnce(new Error());

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
