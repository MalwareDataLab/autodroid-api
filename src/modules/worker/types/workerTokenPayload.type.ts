import { JwtPayload } from "jsonwebtoken";

export type WorkerRefreshTokenPayloadInternalFields = {
  registration_token: string;
  internal_id: string;
  signature: string;
};

export type WorkerAccessTokenPayloadInternalFields =
  WorkerRefreshTokenPayloadInternalFields & {
    refresh_token: string;
  };

export type WorkerRefreshTokenPayload = JwtPayload &
  WorkerRefreshTokenPayloadInternalFields;

export type WorkerAccessTokenPayload = WorkerRefreshTokenPayload &
  WorkerAccessTokenPayloadInternalFields;
