import { Controller, Post, Get, Body, Param, ParseIntPipe, Logger } from '@nestjs/common';
import { WorkersService } from './workers.service';


@Controller('worker')
export class WorkersController {
  private readonly logger = new Logger(WorkersController.name)
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