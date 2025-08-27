import { Test, TestingModule } from '@nestjs/testing';
import { VaultExceptionFilter } from '../vault-exception.filter';
import { ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

// Mock data
const mockRequest = {
  url: '/vault/test-endpoint',
  method: 'GET',
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

// Mock Logger
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

describe('VaultExceptionFilter', () => {
  let filter: VaultExceptionFilter;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultExceptionFilter,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    filter = module.get<VaultExceptionFilter>(VaultExceptionFilter);
    logger = module.get<Logger>(Logger);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Filter Initialization', () => {
    it('should be defined', () => {
      expect(filter).toBeDefined();
    });

    it('should have logger injected', () => {
      expect(logger).toBeDefined();
    });
  });

  describe('catch method', () => {
    it('should handle Vault authentication errors', () => {
      // Arrange
      const error = new Error('permission denied');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.UNAUTHORIZED,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Authentication Error',
        message: 'Vault authentication failed. Please check your credentials.',
        details: 'permission denied',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Vault authentication error: permission denied',
        expect.any(String),
        'VaultExceptionFilter'
      );
    });

    it('should handle Vault connection errors', () => {
      // Arrange
      const error = new Error('ECONNREFUSED');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Service Unavailable',
        message: 'Unable to connect to Vault service. Please try again later.',
        details: 'ECONNREFUSED',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Vault connection error: ECONNREFUSED',
        expect.any(String),
        'VaultExceptionFilter'
      );
    });

    it('should handle Vault secret not found errors', () => {
      // Arrange
      const error = new Error('no value found');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Secret Not Found',
        message: 'The requested secret was not found in Vault.',
        details: 'no value found',
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Vault secret not found: no value found',
        'VaultExceptionFilter'
      );
    });

    it('should handle Vault policy not found errors', () => {
      // Arrange
      const error = new Error('no policy found');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Policy Not Found',
        message: 'The requested policy was not found in Vault.',
        details: 'no policy found',
      });
    });

    it('should handle Vault validation errors', () => {
      // Arrange
      const error = new Error('invalid request');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Validation Error',
        message: 'The request to Vault is invalid. Please check your parameters.',
        details: 'invalid request',
      });
    });

    it('should handle Vault sealed errors', () => {
      // Arrange
      const error = new Error('Vault is sealed');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Service Unavailable',
        message: 'Vault is currently sealed and cannot process requests.',
        details: 'Vault is sealed',
      });
    });

    it('should handle Vault transit key errors', () => {
      // Arrange
      const error = new Error('encryption key not found');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Transit Key Not Found',
        message: 'The specified encryption key was not found.',
        details: 'encryption key not found',
      });
    });

    it('should handle Vault rate limiting errors', () => {
      // Arrange
      const error = new Error('rate limit exceeded');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Rate Limit Exceeded',
        message: 'Too many requests to Vault. Please try again later.',
        details: 'rate limit exceeded',
      });
    });

    it('should handle path already exists errors', () => {
      // Arrange
      const error = new Error('path is already in use');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.CONFLICT,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Resource Conflict',
        message: 'The specified path or resource already exists in Vault.',
        details: 'path is already in use',
      });
    });

    it('should handle generic Vault errors', () => {
      // Arrange
      const error = new Error('unknown vault error');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Service Error',
        message: 'An unexpected error occurred while communicating with Vault.',
        details: 'unknown vault error',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected vault error: unknown vault error',
        expect.any(String),
        'VaultExceptionFilter'
      );
    });

    it('should handle case-insensitive error messages', () => {
      // Arrange
      const error = new Error('Permission Denied');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.UNAUTHORIZED,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Authentication Error',
        message: 'Vault authentication failed. Please check your credentials.',
        details: 'Permission Denied',
      });
    });

    it('should handle errors with additional context', () => {
      // Arrange
      const error = new Error('no value found at secret/test/path');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Secret Not Found',
        message: 'The requested secret was not found in Vault.',
        details: 'no value found at secret/test/path',
      });
    });

    it('should include timestamp in ISO format', () => {
      // Arrange
      const error = new Error('test error');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(responseData.timestamp)).toBeInstanceOf(Date);
    });

    it('should preserve original error stack trace in logs', () => {
      // Arrange
      const error = new Error('test error with stack');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected vault error: test error with stack',
        error.stack,
        'VaultExceptionFilter'
      );
    });

    it('should handle null or undefined error messages', () => {
      // Arrange
      const error = new Error('');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Vault Service Error',
        message: 'An unexpected error occurred while communicating with Vault.',
        details: '',
      });
    });

    it('should handle different request URLs', () => {
      // Arrange
      const customMockRequest = { ...mockRequest, url: '/vault/secrets/database' };
      const customMockHost: ArgumentsHost = {
        ...mockArgumentsHost,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(customMockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      };
      const error = new Error('test error');

      // Act
      filter.catch(error, customMockHost);

      // Assert
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.path).toBe('/vault/secrets/database');
    });
  });

  describe('Error Classification', () => {
    const testCases = [
      {
        message: 'permission denied',
        expectedStatus: HttpStatus.UNAUTHORIZED,
        expectedError: 'Vault Authentication Error',
      },
      {
        message: 'ECONNREFUSED',
        expectedStatus: HttpStatus.SERVICE_UNAVAILABLE,
        expectedError: 'Vault Service Unavailable',
      },
      {
        message: 'no value found',
        expectedStatus: HttpStatus.NOT_FOUND,
        expectedError: 'Vault Secret Not Found',
      },
      {
        message: 'invalid request',
        expectedStatus: HttpStatus.BAD_REQUEST,
        expectedError: 'Vault Validation Error',
      },
      {
        message: 'Vault is sealed',
        expectedStatus: HttpStatus.SERVICE_UNAVAILABLE,
        expectedError: 'Vault Service Unavailable',
      },
      {
        message: 'encryption key not found',
        expectedStatus: HttpStatus.NOT_FOUND,
        expectedError: 'Vault Transit Key Not Found',
      },
      {
        message: 'rate limit exceeded',
        expectedStatus: HttpStatus.TOO_MANY_REQUESTS,
        expectedError: 'Vault Rate Limit Exceeded',
      },
      {
        message: 'path is already in use',
        expectedStatus: HttpStatus.CONFLICT,
        expectedError: 'Vault Resource Conflict',
      },
    ];

    testCases.forEach(({ message, expectedStatus, expectedError }) => {
      it(`should correctly classify "${message}" error`, () => {
        // Arrange
        const error = new Error(message);

        // Act
        filter.catch(error, mockArgumentsHost);

        // Assert
        expect(mockResponse.status).toHaveBeenCalledWith(expectedStatus);
        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData.error).toBe(expectedError);
      });
    });
  });
});
