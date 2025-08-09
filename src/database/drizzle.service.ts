import { Injectable } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as schema from './schema';

@Injectable()
export class DrizzleService {
  public db: NodePgDatabase<typeof schema>;

  constructor() {
    dotenv.config();
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({
      connectionString: databaseUrl,
    });

    this.db = drizzle(pool, { schema });
  }
}