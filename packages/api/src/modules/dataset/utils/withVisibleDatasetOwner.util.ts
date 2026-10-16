// Util import
import { getVisibleOwner } from "@modules/user/utils/getVisibleOwner.util";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";

const withVisibleDatasetOwner = (
  dataset: Dataset,
  user_session: Session | undefined,
): Dataset =>
  Object.assign(new Dataset(), dataset, {
    user: getVisibleOwner(dataset, user_session),
  });

export { withVisibleDatasetOwner };
