import { IsNotEmpty, IsOptional, IsString, MinLength, IsNumber, IsBoolean, Min, IsObject } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateWalletDto {
  @IsNotEmpty({ message: 'Wallet name is required' })
  @IsString({ message: 'Wallet name must be a string' })
  @MinLength(1, { message: 'Wallet name must not be empty' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString({ message: 'Passphrase must be a string' })
  passphrase?: string;
}

export class RestoreWalletDto {
  @IsNotEmpty({ message: 'Mnemonic is required' })
  @IsString({ message: 'Mnemonic must be a string' })
  @Transform(({ value }) => value?.trim())
  mnemonic: string;

  @IsNotEmpty({ message: 'Wallet name is required' })
  @IsString({ message: 'Wallet name must be a string' })
  @MinLength(1, { message: 'Wallet name must not be empty' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString({ message: 'Passphrase must be a string' })
  passphrase?: string;
}

export class CreateAccountDto {
  @IsNotEmpty({ message: 'Account index is required' })
  @IsNumber({}, { message: 'Account index must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Account index must be non-negative' })
  accountIndex: number;

  @IsOptional()
  @IsString({ message: 'Account name must be a string' })
  @Transform(({ value }) => value?.trim())
  name?: string;
}

export class GenerateAddressDto {
  @IsOptional()
  @IsBoolean({ message: 'isChange must be a boolean' })
  @Type(() => Boolean)
  isChange?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'Address index must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Address index must be non-negative' })
  addressIndex?: number;
}

export class SignTransactionDto {
  @IsNotEmpty({ message: 'Transaction data is required' })
  @IsObject({ message: 'Transaction data must be an object' })
  transactionData: any;
}