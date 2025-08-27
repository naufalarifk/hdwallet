import { Test, TestingModule } from '@nestjs/testing';
import { WalletExceptionFilter } from '../wallet-exception.filter';
import { ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

// Mock data
const mockRequest = {
  url: '/wallet/test-endpoint',
  method: 'POST',
  headers: {
    'user-agent': 'Jest Test Suite',
  },
  ip: '127.0.0.1',
} as Request;

const mockResponse = {
  status: jest.fn().mockImplementation(() => mockResponse),
  json: jest.fn().mockImplementation(() => mockResponse),
} as unknown as Response;

const mockArgumentsHost: ArgumentsHost = {
  switchToHttp: jest.fn().mockReturnValue({
    getRequest: jest.fn().mockReturnValue(mockRequest),
    getResponse: jest.fn().mockReturnValue(mockResponse),
  }),
  getArgs: jest.fn(),
  getArgByIndex: jest.fn(),
  switchToRpc: jest.fn(),
  switchToWs: jest.fn(),
  getType: jest.fn(),
};

describe('WalletExceptionFilter', () => {
  let filter: WalletExceptionFilter;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletExceptionFilter],
    }).compile();

    filter = module.get<WalletExceptionFilter>(WalletExceptionFilter);
    
    // Mock the logger
    loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Wallet-specific error handling', () => {
    it('should handle wallet not found error', () => {
      const exception = new Error('Wallet not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'WALLET_NOT_FOUND',
        message: 'Wallet not found',
        timestamp: expect.any(String),
        path: '/wallet/test-endpoint',
        method: 'POST',
      });
    });

    it('should handle account not found error', () => {
      const exception = new Error('Account not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
        timestamp: expect.any(String),
        path: '/wallet/test-endpoint',
        method: 'POST',
      });
    });

    it('should handle address not found error', () => {
      const exception = new Error('Address not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'ADDRESS_NOT_FOUND',
        message: 'Address not found',
        timestamp: expect.any(String),
        path: '/wallet/test-endpoint',
        method: 'POST',
      });
    });

    it('should handle invalid mnemonic error', () => {
      const exception = new Error('Invalid mnemonic');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'INVALID_MNEMONIC',
        message: 'Invalid mnemonic phrase',
        timestamp: expect.any(String),
        path: '/wallet/test-endpoint',
        method: 'POST',
      });
    });

    it('should handle database connection errors', () => {
      const exception = new Error('Database connection failed');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        errorCode: 'DATABASE_CONNECTION_FAILED',
        message: 'Database connection failed',
        timestamp: expect.any(String),
        path: '/wallet/test-endpoint',
        method: 'POST',
      });
    });

    it('should handle insufficient balance errors', () => {
      const exception = new Error('Insufficient balance for transaction');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient balance for transaction',
        timestamp: expect.any(String),
        path: '/wallet/test-endpoint',
        method: 'POST',
      });
    });

    it('should handle encryption/decryption errors', () => {
      const exception = new Error('Encryption failed');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'ENCRYPTION_ERROR',
        message: 'Encryption/decryption failed',
        timestamp: expect.any(String),
        path: '/wallet/test-endpoint',
        method: 'POST',
      });
    });

    it('should handle duplicate resource errors', () => {
      const exception = new Error('Wallet already exists');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.CONFLICT,
        errorCode: 'DUPLICATE_RESOURCE',
        message: 'Resource already exists',
        timestamp: expect.any(String),
        path: '/wallet/test-endpoint',
        method: 'POST',
      });
    });

    it('should handle validation errors', () => {
      const exception = new Error('Invalid wallet name format');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'VALIDATION_ERROR',
        message: 'Invalid wallet name format',
        timestamp: expect.any(String),
        path: '/wallet/test-endpoint',
        method: 'POST',
      });
    });

    it('should handle blockchain network errors', () => {
      const exception = new Error('Blockchain network unavailable');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        errorCode: 'BLOCKCHAIN_NETWORK_ERROR',
        message: 'Blockchain network unavailable',
        timestamp: expect.any(String),
        path: '/wallet/test-endpoint',
        method: 'POST',
      });
    });
  });

  describe('Generic error handling', () => {
    it('should handle unknown errors with default response', () => {
      const exception = new Error('Some unknown error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'WALLET_ERROR',
        message: 'Some unknown error',
        timestamp: expect.any(String),
        path: '/wallet/test-endpoint',
        method: 'POST',
      });
    });

    it('should handle errors without message', () => {
      const exception = {};

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'WALLET_ERROR',
        message: 'Internal server error',
        timestamp: expect.any(String),
        path: '/wallet/test-endpoint',
        method: 'POST',
      });
    });

    it('should log error details', () => {
      const exception = new Error('Test error');
      exception.stack = 'Error stack trace';

      filter.catch(exception, mockArgumentsHost);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Exception caught by WalletExceptionFilter',
        'Error stack trace'
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'POST /wallet/test-endpoint - 500 - Test error',
        'Error stack trace'
      );
    });
  });
});
