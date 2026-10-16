// DTO import
import type { IMcpAuthorizationTokenRecordDTO } from "../types/IMcpAuthorizationRecord.dto";

interface IGrantState {
  token_generation: number;
  scopes: string[];
}

const isMcpAuthorizationGrantLive = <IGrant extends IGrantState>(
  grant: IGrant | null | undefined,
  record: Pick<
    IMcpAuthorizationTokenRecordDTO,
    "token_generation" | "grant_expires_at"
  >,
): grant is IGrant =>
  !!grant &&
  grant.token_generation === record.token_generation &&
  record.grant_expires_at > Date.now();

const getMcpAuthorizationHeldScopes = (
  grant: IGrantState,
  record: Pick<IMcpAuthorizationTokenRecordDTO, "scopes">,
): string[] => record.scopes.filter(scope => grant.scopes.includes(scope));

export { isMcpAuthorizationGrantLive, getMcpAuthorizationHeldScopes };
