// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";

// Entity import
import { User } from "@modules/user/entities/user.entity";

const getVisibleOwner = (
  owned: { user_id: string; user: User },
  user_session: Session | undefined,
): User | null =>
  user_session?.is_admin || user_session?.user?.id === owned.user_id
    ? owned.user
    : null;

export { getVisibleOwner };
