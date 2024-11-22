import { describe, it, vi, afterEach, expect } from "vitest";
import { faker } from "@faker-js/faker";
import { addDays, subDays } from "date-fns";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Enum import
import { DateUtils } from "@shared/utils/dateUtils";
import { STORAGE_PROVIDER } from "../types/storageProvider.enum";

// Repository import
import { IFileRepository } from "../repositories/IFile.repository";

// Entity import
import { File } from "../entities/file.entity";

// Service import
import { ProcessFilePublicAccessService } from "./processFilePublicAccess.service";

const StorageProviderMock = vi.fn(
  () =>
    ({
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),

      generateUploadSignedUrl: vi.fn(),
      refreshFile: vi.fn(),
      removeFileByPath: vi.fn(),
    }) satisfies IStorageProvider,
) as () => IStorageProvider;

const FileRepositoryMock = vi.fn(
  () =>
    ({
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    }) satisfies IFileRepository,
) as () => IFileRepository;

const fileFactory = (overrides?: Partial<File>) => {
  const file = new File();
  Object.assign<File, Partial<File>>(file, {
    id: faker.string.uuid(),
    allow_public_access: true,
    public_url: faker.internet.url(),
    public_url_expires_at: subDays(faker.date.past(), 1),
    ...overrides,
  });
  return file;
};

const fileDataFactory = () => [
  {
    a: 1,
    b: 1.2,
    c: false,
    d: "test",
    e: null,
    f: undefined,
    g: new Date(),
    h: fileFactory(),
    i: [1, 2, 3],
    j: [
      fileFactory(),
      fileFactory({
        allow_public_access: false,
        public_url: null,
        public_url_expires_at: null,
      }),
    ],
    k: {
      k1: [1, 2, 3],
      k2: [
        fileFactory({
          allow_public_access: false,
          public_url: faker.internet.url(),
          public_url_expires_at: addDays(new Date(), 1),
        }),
        fileFactory({ public_url_expires_at: addDays(new Date(), 1) }),
      ],
    },
    l: [null, fileFactory()],
  },
];

describe("Service: ProcessFilePublicAccessService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should be able to process file public access", async () => {
    const storageProviderMock = StorageProviderMock();
    const fileRepositoryMock = FileRepositoryMock();

    const testCases = fileDataFactory();
    const [testCase] = testCases;

    vi.spyOn(storageProviderMock, "refreshFile").mockImplementation(
      async ({ file }) => {
        const updatedFile = new File();
        Object.assign(updatedFile, { ...file, public_url: "UPDATED" });
        return updatedFile;
      },
    );

    const fileRepositorySpy = vi
      .spyOn(fileRepositoryMock, "updateOne")
      .mockImplementation(async (_: any, data: Partial<File>) => {
        const file = new File();
        Object.assign(file, data);
        return file;
      });

    const processFilePublicAccessService = new ProcessFilePublicAccessService(
      storageProviderMock,
      fileRepositoryMock,
    );

    const result = await processFilePublicAccessService.execute({
      cls: class Test {},
      obj: testCases,
      language: "en",
    });

    expect(fileRepositorySpy).toHaveBeenNthCalledWith(
      1,
      { id: expect.any(String) },
      {
        allow_public_access: false,
        public_url: null,
        public_url_expires_at: null,
      },
    );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          a: testCase.a,
          b: testCase.b,
          c: testCase.c,
          d: testCase.d,
          e: testCase.e,
          f: testCase.f,
          g: testCase.g,
          h: expect.objectContaining({
            public_url: expect.stringMatching("UPDATED"),
          }),
          i: testCase.i,
          j: [
            expect.objectContaining({
              public_url: expect.stringMatching("UPDATED"),
            }),
            expect.objectContaining({
              allow_public_access: false,
              public_url: null,
              public_url_expires_at: null,
            }),
          ],
          k: expect.objectContaining({
            k1: testCase.k.k1,
            k2: [
              expect.objectContaining({
                allow_public_access: false,
                public_url: null,
                public_url_expires_at: null,
              }),
              expect.objectContaining({
                public_url: expect.stringMatching(testCase.k.k2[1].public_url!),
              }),
            ],
          }),
          l: [
            null,
            expect.objectContaining({
              public_url: expect.stringMatching("UPDATED"),
            }),
          ],
        }),
      ]),
    );
  });

  it("should not call if data is empty", async () => {
    const storageProviderMock = StorageProviderMock();
    const fileRepositoryMock = FileRepositoryMock();

    const storageProviderSpy = vi.spyOn(storageProviderMock, "refreshFile");

    const fileRepositorySpy = vi.spyOn(fileRepositoryMock, "updateOne");

    const processFilePublicAccessService = new ProcessFilePublicAccessService(
      storageProviderMock,
      fileRepositoryMock,
    );

    const result = await processFilePublicAccessService.execute({
      cls: {} as any,
      obj: null,
      language: "en",
    });

    expect(storageProviderSpy).not.toHaveBeenCalled();
    expect(fileRepositorySpy).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("should resolve original value in case of error", async () => {
    const storageProviderMock = StorageProviderMock();
    const fileRepositoryMock = FileRepositoryMock();

    const testCases = fileDataFactory();

    vi.spyOn(storageProviderMock, "refreshFile").mockImplementation(
      async ({ file }) => {
        Object.assign(file, { public_url: "UPDATED" });
        return file;
      },
    );

    const fileRepositorySpy = vi
      .spyOn(fileRepositoryMock, "updateOne")
      .mockImplementation(async (_: any, __: any) => {
        return null;
      });

    const processFilePublicAccessService = new ProcessFilePublicAccessService(
      storageProviderMock,
      fileRepositoryMock,
    );

    const result = await processFilePublicAccessService.execute({
      cls: class Test {},
      obj: testCases,
      language: "en",
    });

    expect(fileRepositorySpy).toHaveBeenNthCalledWith(
      1,
      { id: expect.any(String) },
      {
        allow_public_access: false,
        public_url: null,
        public_url_expires_at: null,
      },
    );

    expect(result).toEqual(testCases);
  });

  it("should update file if public_url_expires_at will expire in less than 30 minutes", async () => {
    const storageProviderMock = StorageProviderMock();
    const fileRepositoryMock = FileRepositoryMock();

    const testCase = fileFactory({
      allow_public_access: true,
      public_url: "HO",
      public_url_expires_at: DateUtils.now().add(29, "minutes").toDate(),
    });

    const storageProviderSpy = vi
      .spyOn(storageProviderMock, "refreshFile")
      .mockImplementation(async ({ file }) => {
        Object.assign(file, { public_url: "UPDATED" });
        return file;
      });

    const processFilePublicAccessService = new ProcessFilePublicAccessService(
      storageProviderMock,
      fileRepositoryMock,
    );

    const result = await processFilePublicAccessService.execute({
      cls: class Test {},
      obj: testCase,
    });

    expect(result).toEqual(testCase);
    expect(storageProviderSpy).toHaveBeenCalled();
  });

  it("should not update file if public_url_expires_at is not expired", async () => {
    const storageProviderMock = StorageProviderMock();
    const fileRepositoryMock = FileRepositoryMock();

    const testCase = fileFactory({
      allow_public_access: true,
      public_url: "HO",
      public_url_expires_at: DateUtils.now().add(31, "minutes").toDate(),
    });

    const storageProviderSpy = vi
      .spyOn(storageProviderMock, "refreshFile")
      .mockImplementation(async ({ file }) => {
        Object.assign(file, { public_url: "UPDATED" });
        return file;
      });

    const processFilePublicAccessService = new ProcessFilePublicAccessService(
      storageProviderMock,
      fileRepositoryMock,
    );

    const result = await processFilePublicAccessService.execute({
      cls: class Test {},
      obj: testCase,
    });

    expect(result).toEqual(testCase);
    expect(storageProviderSpy).not.toHaveBeenCalled();
  });
});
