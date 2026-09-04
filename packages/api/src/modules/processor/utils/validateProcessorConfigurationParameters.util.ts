// i18n import
import { TFunction } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { processingParameterValidatorMap } from "@modules/processing/utils/validateAndParseProcessingParameters.util";

// Schema import
import { ProcessorConfigurationParameterSchema } from "../schemas/processor.schema";

const validateProcessorConfigurationParameters = ({
  parameters,
  t,
}: {
  parameters: ProcessorConfigurationParameterSchema[];
  t: TFunction;
}) => {
  parameters.forEach((parameter, index) => {
    const repeatedParameter = parameters.find(
      (p, i) =>
        index !== i &&
        (p.name === parameter.name || p.sequence === parameter.sequence),
    );

    if (repeatedParameter)
      throw new AppError({
        key: "@validate_processor_configuration_parameters/REPEATED_PARAMETER",
        message: t(
          "@validate_processor_configuration_parameters/REPEATED_PARAMETER",
          "Parameter {{ parameter }} repeated with {{ repeated }}.",
          { parameter: parameter.name, repeated: repeatedParameter.name },
        ),
      });

    const isValid = processingParameterValidatorMap[parameter.type];

    if (!isValid)
      throw new AppError({
        key: "@validate_processor_configuration_parameters/INVALID_PARAMETER_TYPE",
        message: t(
          "@validate_processor_configuration_parameters/INVALID_PARAMETER_TYPE",
          "Invalid parameter type for parameter {{ parameter }}.",
          { parameter: parameter.name },
        ),
      });

    if (parameter.default_value && !isValid(parameter.default_value))
      throw new AppError({
        key: "@validate_processor_configuration_parameters/INVALID_PARAMETER_DEFAULT_VALUE",
        message: t(
          "@validate_processor_configuration_parameters/INVALID_PARAMETER_DEFAULT_VALUE",
          "Invalid default value for parameter {{ parameter }}.",
          { parameter: parameter.name },
        ),
      });
  });
};

export { validateProcessorConfigurationParameters };
