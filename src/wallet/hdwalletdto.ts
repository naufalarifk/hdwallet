import { IsNotEmpty, IsOptional, IsString, MinLength, IsNumber, IsBoolean, Min, IsObject } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWalletDto {
  @ApiProperty({
    description: 'Name of the wallet',
    example: 'My Bitcoin Wallet',
    minLength: 1,
  })
  @IsNotEmpty({ message: 'Wallet name is required' })
  @IsString({ message: 'Wallet name must be a string' })
  @MinLength(1, { message: 'Wallet name must not be empty' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Optional BIP39 passphrase for additional security',
    example: 'my-secure-passphrase',
  })
  @IsOptional()
  @IsString({ message: 'Passphrase must be a string' })
  passphrase?: string;
}

export class RestoreWalletDto {
  @ApiProperty({
    description: 'BIP39 mnemonic phrase (12 or 24 words)',
    example: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    minLength: 23,
  })
  @IsNotEmpty({ message: 'Mnemonic is required' })
  @IsString({ message: 'Mnemonic must be a string' })
  @Transform(({ value }) => value?.trim())
  mnemonic: string;

  @ApiProperty({
    description: 'Name for the restored wallet',
    example: 'Restored Wallet',
    minLength: 1,
  })
  @IsNotEmpty({ message: 'Wallet name is required' })
  @IsString({ message: 'Wallet name must be a string' })
  @MinLength(1, { message: 'Wallet name must not be empty' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Optional BIP39 passphrase that was used with the original mnemonic',
    example: 'original-passphrase',
  })
  @IsOptional()
  @IsString({ message: 'Passphrase must be a string' })
  passphrase?: string;
}

export class CreateAccountDto {
  @ApiProperty({
    description: 'BIP44 account index (must be unique within the wallet)',
    example: 0,
    minimum: 0,
  })
  @IsNotEmpty({ message: 'Account index is required' })
  @IsNumber({}, { message: 'Account index must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Account index must be non-negative' })
  accountIndex: number;

  @ApiPropertyOptional({
    description: 'Human-readable name for the account',
    example: 'Main Account',
  })
  @IsOptional()
  @IsString({ message: 'Account name must be a string' })
  @Transform(({ value }) => value?.trim())
  name?: string;
}

export class GenerateAddressDto {
  @ApiPropertyOptional({
    description: 'Whether this is a change address (true) or receiving address (false)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isChange must be a boolean' })
  @Type(() => Boolean)
  isChange?: boolean;

  @ApiPropertyOptional({
    description: 'BIP44 address index within the account',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Address index must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Address index must be non-negative' })
  addressIndex?: number;
}

export class SignTransactionDto {
  @ApiProperty({
    description: 'Raw transaction data in hexadecimal format',
    example: '0100000001a1b2c3d4e5f6789abcdef...',
  })
  @IsNotEmpty({ message: 'Transaction data is required' })
  @IsObject({ message: 'Transaction data must be an object' })
  transactionData: any;
}

// Response DTOs
export class HealthResponseDto {
  @ApiProperty({
    description: 'Health status of the service',
    example: 'ok',
  })
  status: string;

  @ApiProperty({
    description: 'Detailed health message',
    example: 'Wallet service is healthy',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp of health check',
    example: '2023-01-01T12:00:00.000Z',
    format: 'date-time',
  })
  timestamp: string;
}

export class WalletResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the created wallet',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Name of the wallet',
    example: 'My Bitcoin Wallet',
  })
  name: string;

  @ApiProperty({
    description: 'Master public key (xpub) of the wallet',
    example: 'xpub6CUGRUonZSQ4TVXXQrFNh9JoRuaxtjh8yJCFLJhEVZKFx2pHKNXnP4DH3Yj7MnHRSHV5W6o9C4NkPYFwNH1Vz7t8s2p1q3m4n5k6j7h8',
  })
  masterPublicKey: string;

  @ApiProperty({
    description: 'Derivation path used for this wallet',
    example: "m/44'/0'/0'",
  })
  derivationPath: string;

  @ApiProperty({
    description: 'Network type (mainnet, testnet)',
    example: 'mainnet',
  })
  network: string;

  @ApiProperty({
    description: 'Wallet creation timestamp',
    example: '2023-01-01T12:00:00.000Z',
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Indicates if mnemonic is encrypted in Vault',
    example: true,
  })
  isEncrypted: boolean;
}

export class AccountResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the created account',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Wallet ID this account belongs to',
    example: 1,
  })
  walletId: number;

  @ApiProperty({
    description: 'BIP44 account index',
    example: 0,
  })
  accountIndex: number;

  @ApiProperty({
    description: 'Account name',
    example: 'Main Account',
  })
  name: string;

  @ApiProperty({
    description: 'Extended public key for this account',
    example: 'xpub6FnCn6nSzZAw5Tv7vX8F2JrKNXnP4DH3Yj7MnHRSHV5W6o9C4NkPYFwNH1Vz7t8s2p1q3m4n5k6j7h8',
  })
  extendedPublicKey: string;

  @ApiProperty({
    description: 'BIP44 derivation path for this account',
    example: "m/44'/0'/0'",
  })
  derivationPath: string;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2023-01-01T12:00:00.000Z',
    format: 'date-time',
  })
  createdAt: string;
}

export class AddressResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the generated address',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Account ID this address belongs to',
    example: 1,
  })
  accountId: number;

  @ApiProperty({
    description: 'Generated Bitcoin address',
    example: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
  })
  address: string;

  @ApiProperty({
    description: 'Public key associated with this address',
    example: '03ad1d8e89212f0b92c74d23bb710c00662451716a435b97381e8d11f67362a853',
  })
  publicKey: string;

  @ApiProperty({
    description: 'Whether this is a change address',
    example: false,
  })
  isChange: boolean;

  @ApiProperty({
    description: 'Address index within the account',
    example: 0,
  })
  addressIndex: number;

  @ApiProperty({
    description: 'Full BIP44 derivation path for this address',
    example: "m/44'/0'/0'/0/0",
  })
  derivationPath: string;

  @ApiProperty({
    description: 'Address creation timestamp',
    example: '2023-01-01T12:00:00.000Z',
    format: 'date-time',
  })
  createdAt: string;
}

export class BalanceResponseDto {
  @ApiProperty({
    description: 'Wallet ID',
    example: 1,
  })
  walletId: number;

  @ApiProperty({
    description: 'Total confirmed balance in satoshis',
    example: 100000000,
  })
  confirmedBalance: number;

  @ApiProperty({
    description: 'Total unconfirmed balance in satoshis',
    example: 50000000,
  })
  unconfirmedBalance: number;

  @ApiProperty({
    description: 'Total balance in satoshis (confirmed + unconfirmed)',
    example: 150000000,
  })
  totalBalance: number;

  @ApiProperty({
    description: 'Total balance in BTC',
    example: 1.5,
  })
  totalBalanceBtc: number;

  @ApiProperty({
    description: 'Number of addresses with balance',
    example: 3,
  })
  addressCount: number;

  @ApiProperty({
    description: 'Last balance update timestamp',
    example: '2023-01-01T12:00:00.000Z',
    format: 'date-time',
  })
  lastUpdated: string;
}

export class SignatureResponseDto {
  @ApiProperty({
    description: 'Address ID used for signing',
    example: 1,
  })
  addressId: number;

  @ApiProperty({
    description: 'Signed transaction in hexadecimal format',
    example: '0100000001a1b2c3d4e5f6789abcdef...',
  })
  signedTransaction: string;

  @ApiProperty({
    description: 'Transaction hash (TXID)',
    example: 'a1b2c3d4e5f6789abcdef1234567890abcdef1234567890abcdef1234567890ab',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'Size of the signed transaction in bytes',
    example: 250,
  })
  transactionSize: number;

  @ApiProperty({
    description: 'Transaction signing timestamp',
    example: '2023-01-01T12:00:00.000Z',
    format: 'date-time',
  })
  signedAt: string;
}