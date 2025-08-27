import { Controller, Post, Get, Body, Param, ParseIntPipe, Logger, Inject } from '@nestjs/common';
import { HdWalletService } from './hdwallet.service';
import { CreateWalletDto, RestoreWalletDto, CreateAccountDto, GenerateAddressDto, SignTransactionDto } from './hdwalletdto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Controller('wallet')
export class WalletController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;
  constructor(private readonly walletService: HdWalletService) {}


  @Get('health')
  getHealth() {
    this.logger.log('Health check requested');
    return { status: 'ok' };
  }

  @Post('create')
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    const { name, passphrase } = createWalletDto;
    this.logger.log(`Creating wallet: ${name}`);
    return await this.walletService.createWallet(name, passphrase);
  }

  @Post('restore')
  async restoreWallet(@Body() restoreWalletDto: RestoreWalletDto) {
    const { mnemonic, name, passphrase } = restoreWalletDto;
    this.logger.log(`Restoring wallet: ${name}`);
    return await this.walletService.restoreWallet(
      mnemonic, 
      name, 
      passphrase
    );
  }

  @Post(':walletId/accounts')
  async createAccount(
    @Param('walletId', ParseIntPipe) walletId: number,
    @Body() createAccountDto: CreateAccountDto
  ) {
    const { accountIndex, name } = createAccountDto;
    this.logger.log(`Creating account for wallet ${walletId}, account index: ${accountIndex}`);
    return await this.walletService.createAccount(
      walletId, 
      accountIndex, 
      name
    );
  }

  @Post('accounts/:accountId/addresses')
  async generateAddress(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body() generateAddressDto: GenerateAddressDto
  ) {
    const { isChange, addressIndex } = generateAddressDto;
    this.logger.log(`Generating address for account ${accountId}`);
    return await this.walletService.generateAddress(
      accountId, 
      isChange, 
      addressIndex
    );
  }

  @Get(':walletId/balance')
  getBalance(@Param('walletId', ParseIntPipe) walletId: number) {
    this.logger.log(`Getting balance for wallet ${walletId}`);
    const wallet = this.walletService.getWalletBalance(walletId);
    return wallet;
  }

  @Post('addresses/:addressId/sign')
  async signTransaction(
    @Param('addressId', ParseIntPipe) addressId: number,
    @Body() signTransactionDto: SignTransactionDto
  ) {
    this.logger.log(`Signing transaction for address ${addressId}`);
    return this.walletService.signTransaction(addressId, signTransactionDto.transactionData);
  }
}