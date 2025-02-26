// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

import { fileFactory } from "@modules/file/entities/factories/file.factory";

export const getFactories = () => ({
  user: userFactory,

  dataset: datasetFactory,

  file: fileFactory,
});
