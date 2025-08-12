import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet/wallet.controller';
import { HdWalletService } from './wallet/hdwallet.service';


describe('AppController', () => {
  let walletController: WalletController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [HdWalletService],
    }).compile();

    walletController = app.get<WalletController>(WalletController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(walletController.getHealth()).toEqual({ status: 'ok' });
    });
  });
});
