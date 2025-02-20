import { JwtPayload } from "jsonwebtoken";

export type WorkerTokenPayloadInternalFields = {
  registration_token: string;
  internal_id: string;
  signature: string;
};

export type WorkerRefreshTokenPayload = JwtPayload &
  WorkerTokenPayloadInternalFields;

export type WorkerAccessTokenPayload = JwtPayload &
  WorkerTokenPayloadInternalFields;
