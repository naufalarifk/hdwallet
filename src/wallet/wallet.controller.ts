import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { HdWalletService } from './hdwallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: HdWalletService) {}

  @Post('create')
  async createWallet(@Body() body: { name: string; passphrase?: string }) {
    return await this.walletService.createWallet(body.name, body.passphrase);
  }

  @Post('restore')
  async restoreWallet(@Body() body: { mnemonic: string; name: string; passphrase?: string }) {
    return await this.walletService.restoreWallet(body.mnemonic, body.name, body.passphrase);
  }

  @Post(':walletId/accounts')
  async createAccount(
    @Param('walletId') walletId: number,
    @Body() body: { accountIndex: number; name?: string }
  ) {
    return await this.walletService.createAccount(walletId, body.accountIndex, body.name);
  }

  @Post('accounts/:accountId/addresses')
  async generateAddress(
    @Param('accountId') accountId: number,
    @Body() body: { isChange?: boolean; addressIndex?: number }
  ) {
    return await this.walletService.generateAddress(accountId, body.isChange, body.addressIndex);
  }

  @Get(':walletId/balance')
  // eslint-disable-next-line @typescript-eslint/require-await
  async getBalance(@Param('walletId') walletId: number) {

    const wallet = this.walletService.getWalletBalance(walletId);

    return wallet
  }

  @Post('addresses/:addressId/sign')
  async signTransaction(
    @Param('addressId') addressId: number,
    @Body() transactionData: any
  ) {
    return this.walletService.signTransaction(addressId, transactionData);
  }
}