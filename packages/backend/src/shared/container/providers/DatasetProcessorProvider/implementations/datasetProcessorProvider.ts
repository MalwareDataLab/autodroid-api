// Processor import
import processors from "@/processors.json";

// Interface import
import { IDatasetProcessorProvider } from "../models/IDatasetProcessor.provider";

class DatasetProcessorProvider implements IDatasetProcessorProvider {
  public initialization = Promise.resolve();

  public getAcceptedMimeTypes(): string[] {
    return Object.values(processors).flatMap(
      processor => processor.allowed_mime_types,
    );
  }
}

export { DatasetProcessorProvider };
