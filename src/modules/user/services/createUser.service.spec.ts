import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

import { parse } from "@shared/utils/instanceParser";
import { AppError } from "@shared/errors/AppError";
import { CreateUserService } from "./createUser.service";
import { IUserRepository } from "../repositories/IUser.repository";
import { ICreateUserDTO } from "../types/IUser.dto";
import { User } from "../entities/user.entity";

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
    };

    const error = new AppError({
      key: "@create_user_service/FAIL_TO_CREATE_USER",
      message: "Fail to create user.",
      statusCode: 401,
    });

    userRepositoryMock.createOne.mockRejectedValueOnce(error);

    expect(
      createUserService.execute({
        data,
        language: "en",
      }),
    ).rejects.toThrowError(error);
  });
});
