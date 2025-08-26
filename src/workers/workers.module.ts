import { Module } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { blockchainClientProvider } from './providers/blockchain.provider';

@Module({
  providers: [
    blockchainClientProvider,
    WorkersService,
  ],
  controllers: [WorkersController],
  exports: [WorkersService],
})
export class WorkersModule {}