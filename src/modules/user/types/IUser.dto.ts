// Type import
import { BaseEntityFields } from "@shared/types/baseEntityFields.type";

// Entity import
import { User } from "@modules/user/entities/user.entity";

export type UserComputedFields = "is_admin";

export type UserRelationFields =
  | "auth_provider_conns"
  | "datasets"
  | "processors"
  | "worker_registration_tokens"
  | "workers";

export type IUserBase = Omit<User, UserComputedFields | UserRelationFields>;

export type ICreateUserDTO = Omit<
  User,
  // Base
  | BaseEntityFields
  // Computed fields (calculated at entity level)
  | UserComputedFields
  // Relations
  | UserRelationFields
>;

export type IFindUserDTO = AtLeastOneProperty<{
  id?: string;
  email?: string;
  phone_number?: string;
}>;

export type IUpdateUserDTO = Partial<ICreateUserDTO>;
