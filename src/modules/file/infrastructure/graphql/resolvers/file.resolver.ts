import { FieldResolver, Resolver, Root } from "type-graphql";
import { container } from "tsyringe";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Service import
import { ProcessFilePublicAccessService } from "@modules/file/services/processFilePublicAccess.service";

@Resolver(() => File)
class FileResolver {
  @FieldResolver(() => String, { nullable: true })
  async public_url(@Root() file: File): Promise<string | null> {
    const processFilePublicAccessService = container.resolve(
      ProcessFilePublicAccessService,
    );

    const updatedFile = await processFilePublicAccessService.execute({
      cls: File,
      obj: file,
    });

    return updatedFile.public_url;
  }
}

export { FileResolver };
