import "tsyringe";

// Type import
import type {
  Repository,
  RepositoryToken,
} from "@shared/container/repositories";

declare module "tsyringe" {
  export interface DependencyContainer {
    resolve<U extends RepositoryToken>(token: U): Repository<U>;
  }
}
