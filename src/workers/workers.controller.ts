import { Controller, Post, Get, Body, Param, ParseIntPipe, Logger, Inject } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';


@Controller('worker')
export class WorkersController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;
    constructor(
        private readonly workersService: WorkersService,

    ) {}
    @Get('rpc-data')
    async getRpcData() {
        const data = await this.workersService.fetchRpcData();
        this.logger.log(data);
        return data;
    }
}