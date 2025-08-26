import { pgTable, serial, varchar, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

// Existing wallet tables
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

// Better-auth required tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

// Junction table to link users with wallets (optional)
export const userWallets = pgTable('user_wallets', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  walletId: integer('wallet_id').notNull().references(() => wallets.id),
  role: varchar('role', { length: 50 }).default('owner'), // owner, viewer, etc.
  createdAt: timestamp('created_at').defaultNow(),
});