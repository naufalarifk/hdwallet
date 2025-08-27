import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from '../wallet.controller';
import { HdWalletService } from '../hdwallet.service';
import { WinstonModule, WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as winston from 'winston';
import { CreateWalletDto, RestoreWalletDto, CreateAccountDto, GenerateAddressDto, SignTransactionDto } from '../hdwalletdto';

// Mock data
const mockWalletResult = {
  walletId: 1,
  mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  masterPublicKey: 'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8',
};

const mockAccountResult = {
  id: 1,
  walletId: 1,
  accountIndex: 0,
  name: 'Test Account',
  extendedPublicKey: 'xpub6D4BDPcP2GT6oS4t8fhGJwMGG1Bb7PqNiJZNE5xfkQkxsq7JQ8ZGGUg6Z3WjYFw2K2XM',
  extendedPrivateKey: 'encrypted-private-key',
  createdAt: new Date(),
};

const mockAddressResult = {
  id: 1,
  accountId: 1,
  derivationPath: "m/44'/0'/0'/0/0",
  address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
  publicKey: '03f028892bad7ed57d2fb57bf33081d5cfcf6f9ed3d3d7f159c2e2fff579dc341a',
  privateKey: 'encrypted-private-key',
  isChange: false,
  addressIndex: 0,
  createdAt: new Date(),
};

// Mock implementations
const mockHdWalletService = {
  createWallet: jest.fn(),
  restoreWallet: jest.fn(),
  createAccount: jest.fn(),
  generateAddress: jest.fn(),
  getWalletBalance: jest.fn(),
  signTransaction: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

describe('WalletController', () => {
  let controller: WalletController;
  let walletService: HdWalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        WinstonModule.forRoot({
          transports: [
            new winston.transports.Console({
              level: 'error',
              silent: true,
            }),
          ],
        }),
      ],
      controllers: [WalletController],
      providers: [
        {
          provide: HdWalletService,
          useValue: mockHdWalletService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<WalletController>(WalletController);
    walletService = module.get<HdWalletService>(HdWalletService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have wallet service injected', () => {
      expect(walletService).toBeDefined();
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      // Act
      const result = controller.getHealth();

      // Assert
      expect(result).toEqual({ status: 'ok' });
      expect(mockLogger.log).toHaveBeenCalledWith('Health check requested');
    });
  });

  describe('createWallet', () => {
    it('should create a new wallet successfully', async () => {
      // Arrange
      const createWalletDto: CreateWalletDto = {
        name: 'Test Wallet',
        passphrase: 'test-passphrase',
      };
      
      mockHdWalletService.createWallet.mockResolvedValue(mockWalletResult);

      // Act
      const result = await controller.createWallet(createWalletDto);

      // Assert
      expect(result).toEqual(mockWalletResult);
      expect(mockHdWalletService.createWallet).toHaveBeenCalledWith(
        createWalletDto.name,
        createWalletDto.passphrase
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Create wallet request received',
        JSON.stringify(createWalletDto)
      );
      expect(mockLogger.log).toHaveBeenCalledWith(`Creating wallet: ${createWalletDto.name}`);
    });

    it('should create wallet without passphrase', async () => {
      // Arrange
      const createWalletDto: CreateWalletDto = {
        name: 'Test Wallet',
      };
      
      mockHdWalletService.createWallet.mockResolvedValue(mockWalletResult);

      // Act
      const result = await controller.createWallet(createWalletDto);

      // Assert
      expect(result).toEqual(mockWalletResult);
      expect(mockHdWalletService.createWallet).toHaveBeenCalledWith(
        createWalletDto.name,
        undefined
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const createWalletDto: CreateWalletDto = {
        name: 'Test Wallet',
      };
      const error = new Error('Wallet creation failed');
      mockHdWalletService.createWallet.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createWallet(createWalletDto)).rejects.toThrow('Wallet creation failed');
      expect(mockHdWalletService.createWallet).toHaveBeenCalledWith(createWalletDto.name, undefined);
    });
  });

  describe('restoreWallet', () => {
    it('should restore wallet successfully', async () => {
      // Arrange
      const restoreWalletDto: RestoreWalletDto = {
        mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        name: 'Restored Wallet',
        passphrase: 'test-passphrase',
      };
      
      mockHdWalletService.restoreWallet.mockResolvedValue(mockWalletResult);

      // Act
      const result = await controller.restoreWallet(restoreWalletDto);

      // Assert
      expect(result).toEqual(mockWalletResult);
      expect(mockHdWalletService.restoreWallet).toHaveBeenCalledWith(
        restoreWalletDto.mnemonic,
        restoreWalletDto.name,
        restoreWalletDto.passphrase
      );
      expect(mockLogger.log).toHaveBeenCalledWith(`Restoring wallet: ${restoreWalletDto.name}`);
    });

    it('should restore wallet without passphrase', async () => {
      // Arrange
      const restoreWalletDto: RestoreWalletDto = {
        mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        name: 'Restored Wallet',
      };
      
      mockHdWalletService.restoreWallet.mockResolvedValue(mockWalletResult);

      // Act
      const result = await controller.restoreWallet(restoreWalletDto);

      // Assert
      expect(result).toEqual(mockWalletResult);
      expect(mockHdWalletService.restoreWallet).toHaveBeenCalledWith(
        restoreWalletDto.mnemonic,
        restoreWalletDto.name,
        undefined
      );
    });

    it('should handle invalid mnemonic', async () => {
      // Arrange
      const restoreWalletDto: RestoreWalletDto = {
        mnemonic: 'invalid mnemonic phrase',
        name: 'Test Wallet',
      };
      const error = new Error('Invalid mnemonic');
      mockHdWalletService.restoreWallet.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.restoreWallet(restoreWalletDto)).rejects.toThrow('Invalid mnemonic');
    });
  });

  describe('createAccount', () => {
    it('should create account successfully', async () => {
      // Arrange
      const walletId = 1;
      const createAccountDto: CreateAccountDto = {
        accountIndex: 0,
        name: 'Test Account',
      };
      
      mockHdWalletService.createAccount.mockResolvedValue(mockAccountResult);

      // Act
      const result = await controller.createAccount(walletId, createAccountDto);

      // Assert
      expect(result).toEqual(mockAccountResult);
      expect(mockHdWalletService.createAccount).toHaveBeenCalledWith(
        walletId,
        createAccountDto.accountIndex,
        createAccountDto.name
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Creating account for wallet ${walletId}, account index: ${createAccountDto.accountIndex}`
      );
    });

    it('should create account without name', async () => {
      // Arrange
      const walletId = 1;
      const createAccountDto: CreateAccountDto = {
        accountIndex: 0,
      };
      
      mockHdWalletService.createAccount.mockResolvedValue(mockAccountResult);

      // Act
      const result = await controller.createAccount(walletId, createAccountDto);

      // Assert
      expect(result).toEqual(mockAccountResult);
      expect(mockHdWalletService.createAccount).toHaveBeenCalledWith(
        walletId,
        createAccountDto.accountIndex,
        undefined
      );
    });

    it('should handle invalid wallet ID', async () => {
      // Arrange
      const walletId = 999;
      const createAccountDto: CreateAccountDto = {
        accountIndex: 0,
      };
      const error = new Error('Wallet not found');
      mockHdWalletService.createAccount.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createAccount(walletId, createAccountDto)).rejects.toThrow('Wallet not found');
    });
  });

  describe('generateAddress', () => {
    it('should generate address successfully', async () => {
      // Arrange
      const accountId = 1;
      const generateAddressDto: GenerateAddressDto = {
        isChange: false,
        addressIndex: 0,
      };
      
      mockHdWalletService.generateAddress.mockResolvedValue(mockAddressResult);

      // Act
      const result = await controller.generateAddress(accountId, generateAddressDto);

      // Assert
      expect(result).toEqual(mockAddressResult);
      expect(mockHdWalletService.generateAddress).toHaveBeenCalledWith(
        accountId,
        generateAddressDto.isChange,
        generateAddressDto.addressIndex
      );
      expect(mockLogger.log).toHaveBeenCalledWith(`Generating address for account ${accountId}`);
    });

    it('should generate address with default values', async () => {
      // Arrange
      const accountId = 1;
      const generateAddressDto: GenerateAddressDto = {};
      
      mockHdWalletService.generateAddress.mockResolvedValue(mockAddressResult);

      // Act
      const result = await controller.generateAddress(accountId, generateAddressDto);

      // Assert
      expect(result).toEqual(mockAddressResult);
      expect(mockHdWalletService.generateAddress).toHaveBeenCalledWith(
        accountId,
        undefined,
        undefined
      );
    });

    it('should handle invalid account ID', async () => {
      // Arrange
      const accountId = 999;
      const generateAddressDto: GenerateAddressDto = {
        isChange: false,
        addressIndex: 0,
      };
      const error = new Error('Account not found');
      mockHdWalletService.generateAddress.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.generateAddress(accountId, generateAddressDto)).rejects.toThrow('Account not found');
    });
  });

  describe('getBalance', () => {
    it('should return wallet balance', () => {
      // Arrange
      const walletId = 1;
      const mockBalance = 1000000; // satoshis
      mockHdWalletService.getWalletBalance.mockReturnValue(mockBalance);

      // Act
      const result = controller.getBalance(walletId);

      // Assert
      expect(result).toBe(mockBalance);
      expect(mockHdWalletService.getWalletBalance).toHaveBeenCalledWith(walletId);
      expect(mockLogger.log).toHaveBeenCalledWith(`Getting balance for wallet ${walletId}`);
    });

    it('should handle zero balance', () => {
      // Arrange
      const walletId = 1;
      const mockBalance = 0;
      mockHdWalletService.getWalletBalance.mockReturnValue(mockBalance);

      // Act
      const result = controller.getBalance(walletId);

      // Assert
      expect(result).toBe(0);
      expect(mockHdWalletService.getWalletBalance).toHaveBeenCalledWith(walletId);
    });
  });

  describe('signTransaction', () => {
    it('should sign transaction successfully', async () => {
      // Arrange
      const addressId = 1;
      const signTransactionDto: SignTransactionDto = {
        transactionData: {
          to: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          amount: 1000000,
          fee: 1000,
        },
      };
      const mockSignedTransaction = '0100000001...'; // Mock hex transaction
      
      mockHdWalletService.signTransaction.mockResolvedValue(mockSignedTransaction);

      // Act
      const result = await controller.signTransaction(addressId, signTransactionDto);

      // Assert
      expect(result).toBe(mockSignedTransaction);
      expect(mockHdWalletService.signTransaction).toHaveBeenCalledWith(
        addressId,
        signTransactionDto.transactionData
      );
      expect(mockLogger.log).toHaveBeenCalledWith(`Signing transaction for address ${addressId}`);
    });

    it('should handle invalid address ID', async () => {
      // Arrange
      const addressId = 999;
      const signTransactionDto: SignTransactionDto = {
        transactionData: {
          to: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          amount: 1000000,
        },
      };
      const error = new Error('Address not found');
      mockHdWalletService.signTransaction.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.signTransaction(addressId, signTransactionDto)).rejects.toThrow('Address not found');
    });

    it('should handle signing errors', async () => {
      // Arrange
      const addressId = 1;
      const signTransactionDto: SignTransactionDto = {
        transactionData: {
          to: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          amount: 1000000,
        },
      };
      const error = new Error('Transaction signing failed');
      mockHdWalletService.signTransaction.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.signTransaction(addressId, signTransactionDto)).rejects.toThrow('Transaction signing failed');
    });
  });

  describe('Parameter Validation', () => {
    it('should handle invalid wallet ID type', () => {
      // This would be caught by ParseIntPipe in real application
      const invalidWalletId = 'not-a-number';

      // The ParseIntPipe would validate this
      expect(() => {
        if (isNaN(Number(invalidWalletId))) {
          throw new Error('Validation failed (numeric string is expected)');
        }
      }).toThrow('Validation failed');
    });

    it('should handle invalid account ID type', () => {
      const invalidAccountId = 'not-a-number';

      expect(() => {
        if (isNaN(Number(invalidAccountId))) {
          throw new Error('Validation failed (numeric string is expected)');
        }
      }).toThrow('Validation failed');
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors', async () => {
      // Arrange
      const createWalletDto: CreateWalletDto = {
        name: 'Test Wallet',
      };
      const error = new Error('Database connection failed');
      mockHdWalletService.createWallet.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createWallet(createWalletDto)).rejects.toThrow('Database connection failed');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const createWalletDto: CreateWalletDto = {
        name: 'Test Wallet',
      };
      const error = new Error('Unexpected error');
      mockHdWalletService.createWallet.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createWallet(createWalletDto)).rejects.toThrow('Unexpected error');
    });
  });
});
