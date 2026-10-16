export interface IMcpAuthorizationRequestRecordDTO {
  client_id: string;
  client_kind: "cimd" | "dcr";
  client_name?: string;
  redirect_uris: string[];
  redirect_uri: string;
  code_challenge: string;
  state?: string;
  scopes: string[];
  resource: string;
  presented_at?: number;
}

export interface IMcpAuthorizationCodeRecordDTO {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  resource: string;
  scopes: string[];
  user_auth_provider_conn_id: string;
  user_id: string;
  sessions_epoch: number;
  grant_token_generation: number;
}

export interface IMcpAuthorizationTokenRecordDTO {
  client_id: string;
  user_auth_provider_conn_id: string;
  resource: string;
  scopes: string[];
  grant_id: string;
  token_generation: number;
  grant_expires_at: number;
}

export interface IMcpAuthorizationAccessTokenRecordDTO
  extends IMcpAuthorizationTokenRecordDTO {
  expires_at: number;
}
