import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { HdWalletService } from './hdwallet.service';
import { DrizzleService } from '../database/drizzle.service';
import { EncryptionService } from '../encryption/encription.service';

@Module({
  controllers: [WalletController],
  providers: [HdWalletService, DrizzleService, EncryptionService],
  exports: [HdWalletService],
})
export class WalletModule {}