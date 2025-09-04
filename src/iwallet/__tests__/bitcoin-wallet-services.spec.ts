import { Test, TestingModule } from '@nestjs/testing';

import { BtcMainnetWalletService } from '../BtcMainnetWallet.service';
import { BtcTestnetWalletService } from '../BtcTestnetWallet.service';

describe('Bitcoin Wallet Services', () => {
  let btcMainnetService: BtcMainnetWalletService;
  let btcTestnetService: BtcTestnetWalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BtcMainnetWalletService, BtcTestnetWalletService],
    }).compile();

    btcMainnetService = module.get<BtcMainnetWalletService>(BtcMainnetWalletService);
    btcTestnetService = module.get<BtcTestnetWalletService>(BtcTestnetWalletService);
  });

  it('should be defined', () => {
    expect(btcMainnetService).toBeDefined();
    expect(btcTestnetService).toBeDefined();
  });

  it('should have correct service methods', () => {
    expect(typeof btcMainnetService.derivedPathToWallet).toBe('function');
    expect(typeof btcTestnetService.derivedPathToWallet).toBe('function');
  });
});
