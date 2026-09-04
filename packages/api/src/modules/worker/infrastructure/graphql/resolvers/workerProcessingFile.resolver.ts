import { Arg, Authorized, Ctx, Mutation } from "type-graphql";
import { container } from "tsyringe";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Schema import
import { RequestFileUploadSignedUrlSchema } from "@modules/file/schemas/requestFileUploadSignedUrl.schema";

// Service import
import { WorkerHandleProcessingResultUploadFileService } from "@modules/worker/services/workerHandleProcessingResultUploadFile.service";
import { WorkerHandleProcessingMetricsUploadFileService } from "@modules/worker/services/workerHandleProcessingMetricsUploadFile.service";
import { WorkerGenerateProcessingResultUploadFileService } from "@modules/worker/services/workerGenerateProcessingResultUploadFile.service";
import { WorkerGenerateProcessingMetricsUploadFileService } from "@modules/worker/services/workerGenerateProcessingMetricsUploadFile.service";

class WorkerProcessingFileResolver {
  @Authorized(["WORKER"])
  @Mutation(() => File)
  async workerProcessingGenerateResultFileUpload(
    @Arg("data") data: RequestFileUploadSignedUrlSchema,
    @Arg("processing_id") processing_id: string,
    @Ctx() { agent_info, worker_session: { worker } }: GraphQLContext,
  ): Promise<File> {
    const workerGenerateProcessingResultUploadFileService = container.resolve(
      WorkerGenerateProcessingResultUploadFileService,
    );

    const resultFile =
      await workerGenerateProcessingResultUploadFileService.execute({
        processing_id,
        data,
        worker,
        agent_info,
      });

    return resultFile;
  }

  @Authorized(["WORKER"])
  @Mutation(() => File)
  async workerProcessingCaptureResultFileUpload(
    @Arg("processing_id") processing_id: string,
    @Ctx() { worker_session: { worker } }: GraphQLContext,
  ): Promise<File> {
    const workerHandleProcessingResultUploadFileService = container.resolve(
      WorkerHandleProcessingResultUploadFileService,
    );

    const resultFile =
      await workerHandleProcessingResultUploadFileService.execute({
        processing_id,
        worker,
      });

    return resultFile;
  }

  @Authorized(["WORKER"])
  @Mutation(() => File)
  async workerProcessingGenerateMetricsFileUpload(
    @Arg("data") data: RequestFileUploadSignedUrlSchema,
    @Arg("processing_id") processing_id: string,
    @Ctx() { agent_info, worker_session: { worker } }: GraphQLContext,
  ): Promise<File> {
    const workerGenerateProcessingMetricsUploadFileService = container.resolve(
      WorkerGenerateProcessingMetricsUploadFileService,
    );

    const metricsFile =
      await workerGenerateProcessingMetricsUploadFileService.execute({
        processing_id,
        data,
        worker,
        agent_info,
      });

    return metricsFile;
  }

  @Authorized(["WORKER"])
  @Mutation(() => File)
  async workerProcessingCaptureMetricsFileUpload(
    @Arg("processing_id") processing_id: string,
    @Ctx() { worker_session: { worker } }: GraphQLContext,
  ): Promise<File> {
    const workerHandleProcessingMetricsUploadFileService = container.resolve(
      WorkerHandleProcessingMetricsUploadFileService,
    );

    const metricsFile =
      await workerHandleProcessingMetricsUploadFileService.execute({
        processing_id,
        worker,
      });

    return metricsFile;
  }
}

export { WorkerProcessingFileResolver };
