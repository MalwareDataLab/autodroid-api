import { beforeEach, describe, expect, it, vi } from "vitest";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Target import
import { PrismaFileRepository } from "./prismaFile.repository";

describe("Repository: PrismaFileRepository", () => {
  const file = fileFactory.build();

  const uploadUrlExpiresStartDate = new Date("2024-01-01T00:00:00.000Z");
  const uploadUrlExpiresEndDate = new Date("2024-12-31T23:59:59.000Z");

  let client: {
    file: {
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  let prismaFileRepository: PrismaFileRepository;

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(File, "processAnyNested").mockImplementation(
      async ({ data }: any) => data,
    );

    client = {
      file: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    prismaFileRepository = new PrismaFileRepository({
      client,
    } as unknown as IDatabaseProvider);
  });

  it("should create a file preserving the supplied payload", async () => {
    client.file.create.mockResolvedValueOnce(file);

    const result = await prismaFileRepository.createOne({
      provider_path: file.provider_path,
      payload: { origin: "upload" },
    } as any);

    expect(client.file.create).toHaveBeenCalledWith({
      data: {
        provider_path: file.provider_path,
        payload: { origin: "upload" },
      },
    });
    expect(result).toEqual(expect.objectContaining({ id: file.id }));
  });

  it("should default the payload to an empty object on create", async () => {
    client.file.create.mockResolvedValueOnce(file);

    await prismaFileRepository.createOne({
      provider_path: file.provider_path,
      payload: null,
    } as any);

    expect(client.file.create).toHaveBeenCalledWith({
      data: { provider_path: file.provider_path, payload: {} },
    });
  });

  it("should find one record through findFirst with an empty condition list", async () => {
    client.file.findFirst.mockResolvedValueOnce(file);

    const result = await prismaFileRepository.findOne({ id: file.id });

    expect(client.file.findFirst).toHaveBeenCalledWith({
      where: {
        id: file.id,
        provider_path: undefined,
        public_url: undefined,
        provider_status: undefined,
        AND: [],
      },
    });
    expect(result).toEqual(expect.objectContaining({ id: file.id }));
  });

  it("should return null from findOne when nothing matches", async () => {
    client.file.findFirst.mockResolvedValueOnce(null);

    await expect(
      prismaFileRepository.findOne({ id: file.id }),
    ).resolves.toBeNull();
  });

  it("should build the where clause from every supported filter and both date bounds", async () => {
    client.file.findMany.mockResolvedValueOnce([]);

    await prismaFileRepository.findMany({
      id: file.id,
      provider_path: file.provider_path,
      public_url: "https://cdn.example.com/file.csv",
      provider_status: FILE_PROVIDER_STATUS.READY,
      upload_url_expires_start_date: uploadUrlExpiresStartDate,
      upload_url_expires_end_date: uploadUrlExpiresEndDate,
    });

    expect(client.file.findMany).toHaveBeenCalledWith({
      where: {
        id: file.id,
        provider_path: file.provider_path,
        public_url: "https://cdn.example.com/file.csv",
        provider_status: FILE_PROVIDER_STATUS.READY,
        AND: [
          {
            upload_url_expires_at: {
              not: null,
              gte: uploadUrlExpiresStartDate,
            },
          },
          {
            upload_url_expires_at: {
              not: null,
              lte: uploadUrlExpiresEndDate,
            },
          },
        ],
      },
    });
  });

  it("should push only the lower bound when just the start date is supplied", async () => {
    client.file.findMany.mockResolvedValueOnce([]);

    await prismaFileRepository.findMany({
      id: file.id,
      upload_url_expires_start_date: uploadUrlExpiresStartDate,
    });

    expect(client.file.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: [
          {
            upload_url_expires_at: {
              not: null,
              gte: uploadUrlExpiresStartDate,
            },
          },
        ],
      }),
    });
  });

  it("should push only the upper bound when just the end date is supplied", async () => {
    client.file.findMany.mockResolvedValueOnce([]);

    await prismaFileRepository.findMany({
      id: file.id,
      upload_url_expires_end_date: uploadUrlExpiresEndDate,
    });

    expect(client.file.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: [
          {
            upload_url_expires_at: {
              not: null,
              lte: uploadUrlExpiresEndDate,
            },
          },
        ],
      }),
    });
  });

  it("should run the nested file processing over the findMany result", async () => {
    client.file.findMany.mockResolvedValueOnce([file]);

    const result = await prismaFileRepository.findMany({ id: file.id });

    expect(File.processAnyNested).toHaveBeenCalledWith({
      cls: File,
      data: [expect.objectContaining({ id: file.id })],
    });
    expect(result).toEqual([expect.objectContaining({ id: file.id })]);
  });

  it("should update the record found by the filter preserving the payload", async () => {
    client.file.findFirst.mockResolvedValueOnce(file);
    client.file.update.mockResolvedValueOnce({ ...file, filename: "new.csv" });

    const result = await prismaFileRepository.updateOne({ id: file.id }, {
      filename: "new.csv",
      payload: { revision: 2 },
    } as any);

    expect(client.file.update).toHaveBeenCalledWith({
      where: { id: file.id },
      data: { filename: "new.csv", payload: { revision: 2 } },
    });
    expect(result).toEqual(expect.objectContaining({ filename: "new.csv" }));
  });

  it("should default the payload to an empty object on update", async () => {
    client.file.findFirst.mockResolvedValueOnce(file);
    client.file.update.mockResolvedValueOnce(file);

    await prismaFileRepository.updateOne({ id: file.id }, {
      filename: "new.csv",
    } as any);

    expect(client.file.update).toHaveBeenCalledWith({
      where: { id: file.id },
      data: { filename: "new.csv", payload: {} },
    });
  });

  it("should not update when the record is absent", async () => {
    client.file.findFirst.mockResolvedValueOnce(null);

    await expect(
      prismaFileRepository.updateOne({ id: file.id }, {}),
    ).resolves.toBeNull();
    expect(client.file.update).not.toHaveBeenCalled();
  });

  it("should delete the record found by the filter and return it", async () => {
    client.file.findFirst.mockResolvedValueOnce(file);

    const result = await prismaFileRepository.deleteOne({ id: file.id });

    expect(client.file.delete).toHaveBeenCalledWith({
      where: { id: file.id },
    });
    expect(result).toEqual(expect.objectContaining({ id: file.id }));
  });

  it("should not delete when the record is absent", async () => {
    client.file.findFirst.mockResolvedValueOnce(null);

    await expect(
      prismaFileRepository.deleteOne({ id: file.id }),
    ).resolves.toBeNull();
    expect(client.file.delete).not.toHaveBeenCalled();
  });
});
