import { inject, injectable } from "tsyringe";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Processor } from "../entities/processor.entity";

// Guard import
import { ProcessorGuard } from "../guards/processor.guard";

// Repository import
import { IProcessorRepository } from "../repositories/IProcessor.repository";

interface IRequest {
  processor_id: string;

  user: User;
  language: string;
}

@injectable()
class UserProcessorShowService {
  private processorGuard: ProcessorGuard;

  constructor(
    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,
  ) {
    this.processorGuard = new ProcessorGuard(this.processorRepository);
  }

  public async execute({
    processor_id,
    user,
    language,
  }: IRequest): Promise<Processor> {
    const { processor } = await this.processorGuard.execute({
      user,
      processor_id,
      language,
    });

    return processor;
  }
}

export { UserProcessorShowService };
