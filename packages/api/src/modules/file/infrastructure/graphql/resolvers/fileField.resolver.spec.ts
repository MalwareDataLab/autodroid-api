import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Service import
import { ProcessFilePublicAccessService } from "@modules/file/services/processFilePublicAccess.service";

// Target import
import { FileFieldResolver } from "./fileField.resolver";

describe("Resolver: FileFieldResolver", () => {
  const file = fileFactory.build();

  let processFilePublicAccessService: { execute: ReturnType<typeof vi.fn> };

  let fileFieldResolver: FileFieldResolver;

  beforeEach(() => {
    processFilePublicAccessService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === ProcessFilePublicAccessService)
        return processFilePublicAccessService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    fileFieldResolver = new FileFieldResolver();
  });

  it("should return the refreshed public url of the root file", async () => {
    const refreshedFile = fileFactory.build({
      public_url: "https://storage.example.com/signed",
    });
    processFilePublicAccessService.execute.mockResolvedValueOnce(refreshedFile);

    const result = await fileFieldResolver.public_url(file);

    expect(processFilePublicAccessService.execute).toHaveBeenCalledWith({
      cls: File,
      obj: file,
    });
    expect(result).toBe("https://storage.example.com/signed");
  });

  it("should return null when the processed file has no public url", async () => {
    const refreshedFile = fileFactory.build({ public_url: null });
    processFilePublicAccessService.execute.mockResolvedValueOnce(refreshedFile);

    const result = await fileFieldResolver.public_url(file);

    expect(result).toBeNull();
  });

  it("should propagate a failure processing the file public access", async () => {
    const error = new Error("public access failed");
    processFilePublicAccessService.execute.mockRejectedValueOnce(error);

    await expect(fileFieldResolver.public_url(file)).rejects.toThrowError(
      error,
    );
  });
});
