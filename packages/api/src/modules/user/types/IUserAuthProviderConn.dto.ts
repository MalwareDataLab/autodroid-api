// Type import
import { BaseEntityFields } from "@shared/types/baseEntityFields.type";

// Entity import
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";

export type UserAuthProviderConnRelationFields = "user" | "sessions";

export type IUserAuthProviderConnBase = Omit<
  UserAuthProviderConn,
  UserAuthProviderConnRelationFields
>;

export type ICreateUserAuthProviderConnDTO = Omit<
  UserAuthProviderConn,
  // Base
  | BaseEntityFields

  // Protected
  | "disconnected_at"
  // Relations
  | UserAuthProviderConnRelationFields
>;

export type IFindUserAuthProviderConnDTO = AtLeastOneProperty<{
  id?: string;
  code?: string;
  auth_provider?: string;
  user_id?: string;
  include_disconnected?: boolean;
}>;

export type IUpdateUserAuthProviderConnDTO = Partial<
  Omit<ICreateUserAuthProviderConnDTO, "auth_provider" | "user_id"> &
    Pick<UserAuthProviderConn, "disconnected_at">
>;
