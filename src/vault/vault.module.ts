import { Module } from '@nestjs/common';
import {VaultController} from './vault.controller';
import { VaultService } from './vault.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [VaultController],
  providers: [VaultService],
  imports: [HttpModule],
})
export class VaultModule {}