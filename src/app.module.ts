import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { CommonModule } from './common/common.module';
import { VaultModule } from './vault/vault.module';

@Module({
  imports: [WalletModule, CommonModule, VaultModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
