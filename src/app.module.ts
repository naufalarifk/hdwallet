import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [WalletModule, CommonModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
