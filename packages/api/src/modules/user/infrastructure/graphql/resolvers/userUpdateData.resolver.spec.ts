import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { UserUpdateDataService } from "@modules/user/services/userUpdateData.service";
import { UserUpdateLearningDataService } from "@modules/user/services/userUpdateLearningData.service";

// Schema import
import {
  UserUpdateDataSchema,
  UserUpdateLearningDataSchema,
} from "@modules/user/schemas/userUpdateData.schema";

// Target import
import { UserUpdateDataResolver } from "./userUpdateData.resolver";

describe("Resolver: UserUpdateDataResolver", () => {
  const user = userFactory.build();

  const graphQLContext = {
    user_session: { user },
    language: "en",
  } as GraphQLContext;

  let userUpdateDataService: { execute: ReturnType<typeof vi.fn> };
  let userUpdateLearningDataService: { execute: ReturnType<typeof vi.fn> };

  let userUpdateDataResolver: UserUpdateDataResolver;

  beforeEach(() => {
    userUpdateDataService = { execute: vi.fn() };
    userUpdateLearningDataService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserUpdateDataService) return userUpdateDataService;
      if (token === UserUpdateLearningDataService)
        return userUpdateLearningDataService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userUpdateDataResolver = new UserUpdateDataResolver();
  });

  it("should update the session user data", async () => {
    const data = { name: "Ada Lovelace" } as UserUpdateDataSchema;
    userUpdateDataService.execute.mockResolvedValueOnce(user);

    const result = await userUpdateDataResolver.userUpdateData(
      data,
      graphQLContext,
    );

    expect(userUpdateDataService.execute).toHaveBeenCalledWith({
      user,
      data,
      language: "en",
    });
    expect(result).toBe(user);
  });

  it("should propagate a failure updating the user data", async () => {
    const error = new Error("update failed");
    userUpdateDataService.execute.mockRejectedValueOnce(error);

    await expect(
      userUpdateDataResolver.userUpdateData(
        {} as UserUpdateDataSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should update the session user learning data", async () => {
    const params = { data: { "0": 10 } } as UserUpdateLearningDataSchema;
    userUpdateLearningDataService.execute.mockResolvedValueOnce(user);

    const result = await userUpdateDataResolver.userUpdateLearningData(
      params,
      graphQLContext,
    );

    expect(userUpdateLearningDataService.execute).toHaveBeenCalledWith({
      user,
      params,
      language: "en",
    });
    expect(result).toBe(user);
  });

  it("should propagate a failure updating the learning data", async () => {
    const error = new Error("update failed");
    userUpdateLearningDataService.execute.mockRejectedValueOnce(error);

    await expect(
      userUpdateDataResolver.userUpdateLearningData(
        {} as UserUpdateLearningDataSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });
});
