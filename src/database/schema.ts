import { pgTable, serial, varchar, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  mnemonic: text('mnemonic').notNull(), // Encrypted
  seed: text('seed').notNull(), // Encrypted
  masterPrivateKey: text('master_private_key').notNull(), // Encrypted
  masterPublicKey: text('master_public_key').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  walletId: integer('wallet_id').references(() => wallets.id),
  accountIndex: integer('account_index').notNull(),
  name: varchar('name', { length: 255 }),
  extendedPublicKey: text('extended_public_key').notNull(),
  extendedPrivateKey: text('extended_private_key').notNull(), // Encrypted
  createdAt: timestamp('created_at').defaultNow(),
});

export const addresses = pgTable('addresses', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').references(() => accounts.id),
  derivationPath: varchar('derivation_path', { length: 100 }).notNull(),
  address: varchar('address', { length: 100 }).notNull(),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(), // Encrypted
  isChange: boolean('is_change').default(false),
  addressIndex: integer('address_index').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});