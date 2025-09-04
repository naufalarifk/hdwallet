import { Module } from '@nestjs/common';

import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { OcrModule } from './ocr/ocr.module';
import { VaultModule } from './vault/vault.module';
import { WalletModule } from './wallet/wallet.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [DatabaseModule, WalletModule, CommonModule, VaultModule, OcrModule, WorkersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
