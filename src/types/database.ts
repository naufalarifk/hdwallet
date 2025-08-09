import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';

export type Database = NodePgDatabase<typeof schema>;

// Type for wallet service return types
export interface WalletCreateResult {
  walletId: number;
  mnemonic: string;
  masterPublicKey: string;
}

export interface AccountResult {
  id: number;
  walletId: number | null;
  accountIndex: number;
  name: string | null;
  extendedPublicKey: string;
  extendedPrivateKey: string;
  createdAt: Date | null;
}

export interface AddressResult {
  id: number;
  accountId: number;
  derivationPath: string;
  address: string;
  publicKey: string;
  privateKey: string;
  isChange: boolean | null;
  addressIndex: number;
  createdAt: Date | null;
}
