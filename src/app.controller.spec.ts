import { Test, TestingModule } from '@nestjs/testing';

import { WalletController } from './wallet/wallet.controller';
import { WalletService } from './wallet/wallet.service';

describe('AppController', () => {
  let walletController: WalletController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [WalletService],
    }).compile();

    walletController = app.get<WalletController>(WalletController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(walletController.getHealth()).toEqual({ status: 'ok' });
    });
  });
});
