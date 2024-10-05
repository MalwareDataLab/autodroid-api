import { isInt } from "validator";

// i18n import
import { TFunction } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Entity import
import { Processor } from "@modules/processor/entities/processor.entity";
import { ProcessingParameter } from "@modules/processing/entities/processingParameter.entity";

// Schema import
import { PROCESSOR_PARAMETER_TYPE } from "@modules/processor/types/processorParameterType.enum";
import { RequestDatasetProcessingParameterSchema } from "../schemas/requestDatasetProcessing.schema";

interface IValidateAndParseProcessingParametersDTO {
  parameters: RequestDatasetProcessingParameterSchema[];
  processor: Processor;
  t: TFunction;
}

const processingParameterValidatorMap: Record<
  PROCESSOR_PARAMETER_TYPE,
  (value: string) => boolean
> = {
  [PROCESSOR_PARAMETER_TYPE.STRING]: (value: string) =>
    typeof value === "string" && value.trim().length > 0,
  [PROCESSOR_PARAMETER_TYPE.BOOLEAN]: (value: string) =>
    value === "true" || value === "false",
  [PROCESSOR_PARAMETER_TYPE.INTEGER]: (value: string) => isInt(value),
};

const processingParameterTypeMap = {
  [PROCESSOR_PARAMETER_TYPE.STRING]: (value: string) => value,
  [PROCESSOR_PARAMETER_TYPE.BOOLEAN]: (value: string) => value === "true",
  [PROCESSOR_PARAMETER_TYPE.INTEGER]: (value: string) => Number(value),
} satisfies Record<PROCESSOR_PARAMETER_TYPE, (value: string) => any>;

const validateAndParseProcessingParameters = (
  params: IValidateAndParseProcessingParametersDTO,
): ProcessingParameter[] => {
  const { parameters, processor, t } = params;

  const repeatedParameter = parameters.find((parameter, index) =>
    parameters.find((p, i) => index !== i && p.name === parameter.name),
  );
  if (repeatedParameter)
    throw new AppError({
      key: "@validate_processor_configuration_parameters/REPEATED_PARAMETER",
      message: t(
        "@validate_processor_configuration_parameters/REPEATED_PARAMETER",
        "Repeated parameter {{ parameter }}.",
        { parameter: repeatedParameter.name },
      ),
    });

  const result = processor.configuration.parameters
    .sort((a, b) => a.sequence - b.sequence)
    .map(parameter => {
      const providedParameter = parameters.find(p => p.name === parameter.name);

      if (parameter.is_required && !providedParameter?.value)
        throw new AppError({
          key: "@validate_processor_configuration_parameters/MISSING_PARAMETER",
          message: t(
            "@validate_processor_configuration_parameters/MISSING_PARAMETER",
            "Missing required parameter {{ parameter }}.",
            { parameter: parameter.name },
          ),
        });

      const isValid = processingParameterValidatorMap[parameter.type];
      const parser = processingParameterTypeMap[parameter.type];

      if (providedParameter) {
        if (!isValid(providedParameter.value))
          throw new AppError({
            key: "@validate_processor_configuration_parameters/INVALID_PARAMETER",
            message: t(
              "@validate_processor_configuration_parameters/INVALID_PARAMETER",
              "Invalid value for parameter {{ parameter }}.",
              { parameter: parameter.name },
            ),
          });

        return {
          key: parameter.name,
          value: String(parser(String(providedParameter.value).trim())),
        };
      }
      if (
        parameter.default_value !== null &&
        parameter.default_value !== undefined
      ) {
        if (!isValid(parameter.default_value))
          throw new AppError({
            key: "@validate_processor_configuration_parameters/INVALID_DEFAULT_PARAMETER",
            message: t(
              "@validate_processor_configuration_parameters/INVALID_DEFAULT_PARAMETER",
              "Invalid default value for parameter {{ parameter }}.",
              { parameter: parameter.name },
            ),
          });

        return {
          key: parameter.name,
          value: String(parser(String(parameter.default_value).trim())),
        };
      }

      return {
        key: parameter.name,
        value: null,
      };
    })
    .filter(parameter => parameter.value !== null);

  return result;
};

export {
  validateAndParseProcessingParameters,
  processingParameterValidatorMap,
  processingParameterTypeMap,
};
