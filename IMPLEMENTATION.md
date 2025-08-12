# NestJS HD Wallet with Winston Logger & Validation

This project has been enhanced with colorful Winston logging and comprehensive validation using class-validator and class-transformer.

## Features Implemented

### 🌈 Colorful Winston Logger
- **Custom colorized output** with timestamp, level, context, and message
- **Color coding**: 
  - ERROR: Red
  - WARN: Yellow  
  - INFO: Green
  - DEBUG: Cyan
  - Context: Magenta
  - Timestamp: Gray
- **Production logging**: File-based logging for errors and combined logs
- **Structured logging**: JSON metadata support with stack traces

### ✅ Class Validator & Transformer
- **Global validation pipe** with automatic transformation
- **Whitelist enabled**: Strips unknown properties
- **Comprehensive DTOs** for all endpoints:
  - `CreateWalletDto`: Wallet name validation with trimming
  - `RestoreWalletDto`: Mnemonic and name validation
  - `CreateAccountDto`: Account index validation
  - `GenerateAddressDto`: Address generation parameters
  - `SignTransactionDto`: Transaction data validation

### 🔧 Configuration
- **Environment-aware**: Different log levels for development vs production
- **Type-safe**: Proper TypeScript types throughout
- **Parameterized routes**: Using `ParseIntPipe` for number validation
- **Context logging**: Each controller logs with proper context

## API Endpoints

### POST /wallet/create
Create a new HD wallet
```json
{
  "name": "my-wallet",
  "passphrase": "optional-passphrase"
}
```

### POST /wallet/restore
Restore wallet from mnemonic
```json
{
  "mnemonic": "word1 word2 ... word12",
  "name": "restored-wallet",
  "passphrase": "optional-passphrase"
}
```

### POST /wallet/:walletId/accounts
Create account for wallet
```json
{
  "accountIndex": 0,
  "name": "optional-account-name"
}
```

### POST /wallet/accounts/:accountId/addresses
Generate address for account
```json
{
  "isChange": false,
  "addressIndex": 0
}
```

### GET /wallet/:walletId/balance
Get wallet balance

### POST /wallet/addresses/:addressId/sign
Sign transaction
```json
{
  "transactionData": { /* transaction object */ }
}
```

### GET /wallet/health
Health check endpoint

## Validation Examples

### Invalid Request (Empty name):
```bash
curl -X POST http://localhost:3000/wallet/create \
  -H "Content-Type: application/json" \
  -d '{"name": ""}'
```
Response:
```json
{
  "message": ["Wallet name must not be empty", "Wallet name is required"],
  "error": "Bad Request", 
  "statusCode": 400
}
```

### Valid Request:
```bash
curl -X POST http://localhost:3000/wallet/create \
  -H "Content-Type: application/json" \
  -d '{"name": "my-wallet", "passphrase": "secure123"}'
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run start:dev

# Build for production
pnpm run build

# Start production server
pnpm run start:prod
```

## Logging

The application uses Winston with custom colorized console output in development and structured JSON logging in production. Log files are stored in the `logs/` directory for production environments.

## Dependencies Added
- `class-validator`: Decorator-based validation
- `class-transformer`: Object transformation and serialization  
- `winston-console-format`: Enhanced console formatting (optional)
