import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { DrizzleService } from '../database/drizzle.service';
import { EncryptionService } from '../encryption/encription.service';
import { HdWalletService } from './hdwallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [DiscoveryModule],
  controllers: [WalletController],
  providers: [HdWalletService, DrizzleService, EncryptionService],
  exports: [HdWalletService],
})
export class WalletModule {}
