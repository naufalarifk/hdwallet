import { Controller, Post, Get, Body, Param, ParseIntPipe, Logger } from '@nestjs/common';
import { HdWalletService } from './hdwallet.service';
import { CreateWalletDto, RestoreWalletDto, CreateAccountDto, GenerateAddressDto, SignTransactionDto } from './hdwalletdto';

@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: HdWalletService) {}


  @Get('health')
  getHealth() {
    this.logger.log('Health check requested');
    return { status: 'ok' };
  }

  @Post('create')
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    this.logger.log(`Creating wallet: ${createWalletDto.name}`);
    const { name, passphrase } = createWalletDto;
    return await this.walletService.createWallet(name, passphrase);
  }

  @Post('restore')
  async restoreWallet(@Body() restoreWalletDto: RestoreWalletDto) {
    this.logger.log(`Restoring wallet: ${restoreWalletDto.name}`);
    return await this.walletService.restoreWallet(
      restoreWalletDto.mnemonic, 
      restoreWalletDto.name, 
      restoreWalletDto.passphrase
    );
  }

  @Post(':walletId/accounts')
  async createAccount(
    @Param('walletId', ParseIntPipe) walletId: number,
    @Body() createAccountDto: CreateAccountDto
  ) {
    this.logger.log(`Creating account for wallet ${walletId}, account index: ${createAccountDto.accountIndex}`);
    return await this.walletService.createAccount(
      walletId, 
      createAccountDto.accountIndex, 
      createAccountDto.name
    );
  }

  @Post('accounts/:accountId/addresses')
  async generateAddress(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body() generateAddressDto: GenerateAddressDto
  ) {
    this.logger.log(`Generating address for account ${accountId}`);
    return await this.walletService.generateAddress(
      accountId, 
      generateAddressDto.isChange, 
      generateAddressDto.addressIndex
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