import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  ParseIntPipe, 
  Logger, 
  Inject,
  HttpStatus,
  HttpException,
  UseFilters,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiExtraModels,
  getSchemaPath,
  ApiProduces,
  ApiConsumes,
} from '@nestjs/swagger';
import { HdWalletService } from './hdwallet.service';
import { WalletExceptionFilter } from './wallet-exception.filter';
import { 
  CreateWalletDto, 
  RestoreWalletDto, 
  CreateAccountDto, 
  GenerateAddressDto, 
  SignTransactionDto,
  WalletResponseDto,
  AccountResponseDto,
  AddressResponseDto,
  BalanceResponseDto,
  SignatureResponseDto,
  HealthResponseDto,
} from './hdwalletdto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';


//to-do refactor code to be readable

@ApiTags('wallet')
@Controller('wallet')
@UseFilters(WalletExceptionFilter)
@ApiExtraModels(
  WalletResponseDto,
  AccountResponseDto,
  AddressResponseDto,
  BalanceResponseDto,
  SignatureResponseDto,
  HealthResponseDto,
)
@ApiProduces('application/json')
@ApiConsumes('application/json')
export class WalletController {
  @Inject(WINSTON_MODULE_NEST_PROVIDER)
  private readonly logger: Logger;

  constructor(private readonly walletService: HdWalletService) {}

    @Get('health')
  @ApiOperation({
    summary: 'Health check for wallet service',
    description: 'Returns the current status and health of the wallet service. Used for monitoring and load balancer health checks.',
    operationId: 'getWalletHealth',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wallet service is healthy and operational',
    schema: {
      $ref: getSchemaPath(HealthResponseDto),
    },
  })
  getHealth(): HealthResponseDto {
    this.logger.log('Health check requested');
    return { 
      status: 'ok', 
      message: 'Wallet service is healthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('create')
  @ApiOperation({
    summary: 'Create a new HD wallet',
    description: 'Creates a new hierarchical deterministic (HD) wallet with a generated mnemonic phrase. The mnemonic is securely encrypted and stored in Vault.',
    operationId: 'createWallet',
  })
  @ApiBody({
    type: CreateWalletDto,
    description: 'Wallet creation parameters',
    examples: {
      basic: {
        summary: 'Basic wallet creation',
        value: {
          name: 'My Bitcoin Wallet',
          passphrase: 'optional-bip39-passphrase',
        },
      },
      noPassphrase: {
        summary: 'Wallet without passphrase',
        value: {
          name: 'Simple Wallet',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Wallet created successfully',
    schema: {
      $ref: getSchemaPath(WalletResponseDto),
    },
  })
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    const { name, passphrase } = createWalletDto;
    try {
      return await this.walletService.createWallet(name, passphrase);
    } catch (error) {
      this.logger.error(`Failed to create wallet ${name}:`, error);
      // Preserve the original error message if it's a known error type
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to create wallet', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('restore')
  @ApiOperation({
    summary: 'Restore HD wallet from mnemonic',
    description: 'Restores an existing HD wallet using a BIP39 mnemonic phrase. The mnemonic is validated and the wallet is recreated with all its derivation paths.',
    operationId: 'restoreWallet',
  })
  @ApiBody({
    type: RestoreWalletDto,
    description: 'Wallet restoration parameters',
    examples: {
      basic: {
        summary: 'Basic wallet restoration',
        value: {
          mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
          name: 'Restored Wallet',
          passphrase: 'optional-bip39-passphrase',
        },
      },
      noPassphrase: {
        summary: 'Restore without passphrase',
        value: {
          mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
          name: 'Simple Restored Wallet',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Wallet restored successfully',
    schema: {
      $ref: getSchemaPath(WalletResponseDto),
    },
  })
  async restoreWallet(@Body() restoreWalletDto: RestoreWalletDto) {
    this.logger.log('Restore wallet request received');
    const { mnemonic, name, passphrase } = restoreWalletDto;
    try {
      return await this.walletService.restoreWallet(mnemonic, name, passphrase);
    } catch (error) {
      this.logger.error(`Failed to restore wallet ${name}:`, error);
      // Preserve the original error message if it's a known error type
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to restore wallet', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':walletId/accounts')
  @ApiOperation({
    summary: 'Create new account in wallet',
    description: 'Creates a new account within an existing HD wallet using BIP44 derivation path. Each account can have multiple addresses.',
    operationId: 'createAccount',
  })
  @ApiParam({
    name: 'walletId',
    type: 'integer',
    description: 'Unique identifier of the wallet',
    example: 1,
  })
  @ApiBody({
    type: CreateAccountDto,
    description: 'Account creation parameters',
    examples: {
      basic: {
        summary: 'Create account',
        value: {
          accountIndex: 0,
          name: 'Main Account',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Account created successfully',
    schema: {
      $ref: getSchemaPath(AccountResponseDto),
    },
  })
  async createAccount(
    @Param('walletId', ParseIntPipe) walletId: number,
    @Body() createAccountDto: CreateAccountDto,
  ) {
    const { accountIndex, name } = createAccountDto;
    this.logger.log(`Creating account for wallet ${walletId}, account index: ${accountIndex}`);
    try {
      return await this.walletService.createAccount(walletId, accountIndex, name);
    } catch (error) {
      this.logger.error(`Failed to create account for wallet ${walletId}:`, error);
      // Preserve the original error message if it's a known error type
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to create account', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('accounts/:accountId/addresses')
  @ApiOperation({
    summary: 'Generate new address for account',
    description: 'Generates a new Bitcoin address for the specified account. Supports both receiving (external) and change (internal) addresses.',
    operationId: 'generateAddress',
  })
  @ApiParam({
    name: 'accountId',
    type: 'integer',
    description: 'Unique identifier of the account',
    example: 1,
  })
  @ApiBody({
    type: GenerateAddressDto,
    description: 'Address generation parameters',
    examples: {
      receiving: {
        summary: 'Generate receiving address',
        value: {
          isChange: false,
          addressIndex: 0,
        },
      },
      change: {
        summary: 'Generate change address',
        value: {
          isChange: true,
          addressIndex: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Address generated successfully',
    schema: {
      $ref: getSchemaPath(AddressResponseDto),
    },
  })
  async generateAddress(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body() generateAddressDto: GenerateAddressDto,
  ): Promise<AddressResponseDto> {
    const { isChange, addressIndex } = generateAddressDto;
    this.logger.log(`Generating address for account ${accountId}`);
    try {
      return await this.walletService.generateAddress(accountId, isChange, addressIndex);
    } catch (error) {
      this.logger.error(`Failed to generate address for account ${accountId}:`, error);
      // Preserve the original error message if it's a known error type
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to generate address', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':walletId/balance')
  @ApiOperation({
    summary: 'Get wallet balance',
    description: 'Retrieves the total balance for all accounts and addresses within the specified wallet.',
    operationId: 'getWalletBalance',
  })
  @ApiParam({
    name: 'walletId',
    type: 'integer',
    description: 'Unique identifier of the wallet',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wallet balance retrieved successfully',
    schema: {
      $ref: getSchemaPath(BalanceResponseDto),
    },
  })
  getBalance(@Param('walletId', ParseIntPipe) walletId: number): BalanceResponseDto {
    this.logger.log(`Getting balance for wallet ${walletId}`);
    try {
      return this.walletService.getWalletBalance(walletId);
    } catch (error) {
      this.logger.error(`Failed to get balance for wallet ${walletId}:`, error);
      // Preserve the original error message if it's a known error type
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to get wallet balance', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('addresses/:addressId/sign')
  @ApiOperation({
    summary: 'Sign transaction with address private key',
    description: 'Signs a Bitcoin transaction using the private key associated with the specified address. The transaction data should be in raw format.',
    operationId: 'signTransaction',
  })
  @ApiParam({
    name: 'addressId',
    type: 'integer',
    description: 'Unique identifier of the address to use for signing',
    example: 1,
  })
  @ApiBody({
    type: SignTransactionDto,
    description: 'Transaction signing parameters',
    examples: {
      basic: {
        summary: 'Sign Bitcoin transaction',
        value: {
          transactionData: '0100000001a1b2c3d4e5f6789...',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction signed successfully',
    schema: {
      $ref: getSchemaPath(SignatureResponseDto),
    },
  })
  async signTransaction(
    @Param('addressId', ParseIntPipe) addressId: number,
    @Body() signTransactionDto: SignTransactionDto,
  ): Promise<SignatureResponseDto> {
    this.logger.log(`Signing transaction for address ${addressId}`);
    try {
      return await this.walletService.signTransaction(addressId, signTransactionDto.transactionData);
    } catch (error) {
      this.logger.error(`Failed to sign transaction for address ${addressId}:`, error);
      // Preserve the original error message if it's a known error type
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to sign transaction', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}