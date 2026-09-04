import { validateOrReject } from "class-validator";

// i18n import
import { t } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Entity import
import { Processor } from "../entities/processor.entity";

// Schema import
import { ProcessorSchema } from "../schemas/processor.schema";

// Util import
import { validateProcessorConfigurationParameters } from "./validateProcessorConfigurationParameters.util";

const validateProcessor = async (processor: Processor) => {
  try {
    const processorData = ProcessorSchema.make(processor);

    await validateOrReject(processorData);

    validateProcessorConfigurationParameters({
      parameters: processor.configuration.parameters,
      t,
    });
  } catch (error) {
    throw new AppError({
      key: "@validate_processor/PROCESSOR_VALIDATION_ERROR",
      message: "Invalid processor.",
      payload: {
        error,
      },
    });
  }
};

export { validateProcessor };
