// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

export const getFactories = () => ({
  user: userFactory,

  dataset: datasetFactory,

  file: fileFactory,

  worker: workerFactory,
  workerRegistrationToken: workerRegistrationTokenFactory,

  processor: processorFactory,
  processing: processingFactory,
});
