// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

export interface IAuthenticationProviderVerifyTokenRequestDTO {
  access_token: string;
  language: string;
}

export interface ICreateUserTokenByCodeDTO {
  code: string;
  language: string;
  payload?: Record<string, any>;
}

export interface IAuthenticationProviderSessionDTO {
  access_token: string;
  access_token_expires_at: Date;
  refresh_token?: string;
  refresh_token_expires_at?: Date;
  user_code: string;
  payload: Record<string, any>;
  auth_provider: AUTH_PROVIDER;
}
