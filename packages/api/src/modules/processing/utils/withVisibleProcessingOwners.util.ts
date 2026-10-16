// Util import
import { withVisibleDatasetOwner } from "@modules/dataset/utils/withVisibleDatasetOwner.util";
import { getVisibleOwner } from "@modules/user/utils/getVisibleOwner.util";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";

// Entity import
import { Processing } from "@modules/processing/entities/processing.entity";

const withVisibleProcessingOwners = (
  processing: Processing,
  user_session: Session | undefined,
): Processing =>
  Object.assign(new Processing(), processing, {
    user: getVisibleOwner(processing, user_session),
    dataset: withVisibleDatasetOwner(processing.dataset, user_session),
  });

export { withVisibleProcessingOwners };
