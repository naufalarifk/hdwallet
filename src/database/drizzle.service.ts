import { Inject, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import * as schema from './schema';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  public db: NodePgDatabase<typeof schema>;
  private pool: Pool;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    // Initialize the PostgreSQL pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Initialize Drizzle with custom logger
    this.db = drizzle(this.pool, {
      schema,
      logger: {
        logQuery: (query: string, params: unknown[]) => {
          this.logger.info('Database Query', {
            query: query.replace(/\s+/g, ' ').trim(),
            params: params.length > 0 ? params : undefined,
            timestamp: new Date().toISOString(),
            duration: undefined, // Will be set by query wrapper
          });
        },
      },
    });

    // Set up pool event listeners (similar to Prisma's $on)
    this.setupPoolEventListeners();
  }

  async onModuleInit() {
    try {
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.logger.info('Database connection established successfully', {
        context: 'DrizzleService',
        database: 'PostgreSQL',
      });
    } catch (error) {
      this.logger.error('Failed to connect to database', {
        context: 'DrizzleService',
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.pool.end();
      this.logger.info('Database connection pool closed', {
        context: 'DrizzleService',
      });
    } catch (error) {
      this.logger.error('Error closing database connection pool', {
        context: 'DrizzleService',
        error: error.message,
      });
    }
  }

  private setupPoolEventListeners() {
    // Pool connect event
    this.pool.on('connect', (client) => {
      this.logger.info('New database client connected', {
        context: 'DrizzleService',
        processId: client.processID,
      });
    });

    // Pool error event
    this.pool.on('error', (err, client) => {
      this.logger.error('Database pool error', {
        context: 'DrizzleService',
        error: err.message,
        processId: client?.processID,
        stack: err.stack,
      });
    });

    // Pool remove event
    this.pool.on('remove', (client) => {
      this.logger.info('Database client removed from pool', {
        context: 'DrizzleService',
        processId: client.processID,
      });
    });

    // Pool acquire event
    this.pool.on('acquire', (client) => {
      this.logger.debug('Database client acquired from pool', {
        context: 'DrizzleService',
        processId: client.processID,
      });
    });

    // Pool release event
    this.pool.on('release', (err, client) => {
      if (err) {
        this.logger.warn('Error releasing database client', {
          context: 'DrizzleService',
          error: err.message,
          processId: client?.processID,
        });
      } else {
        this.logger.debug('Database client released back to pool', {
          context: 'DrizzleService',
          processId: client.processID,
        });
      }
    });
  }

  // Helper method to execute queries with enhanced logging (similar to Prisma's middleware)
  async executeWithLogging<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      this.logger.info(`Starting ${operationName}`, {
        context: 'DrizzleService',
        operation: operationName,
        ...context,
      });

      const result = await operation();
      const duration = Date.now() - startTime;

      this.logger.info(`Completed ${operationName}`, {
        context: 'DrizzleService',
        operation: operationName,
        duration: `${duration}ms`,
        success: true,
        ...context,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(`Failed ${operationName}`, {
        context: 'DrizzleService',
        operation: operationName,
        duration: `${duration}ms`,
        success: false,
        error: error.message,
        stack: error.stack,
        ...context,
      });

      throw error;
    }
  }

  // Wrapper methods for common operations with logging
  async findMany<T>(
    query: () => Promise<T[]>,
    tableName: string,
    filters?: Record<string, any>
  ): Promise<T[]> {
    return this.executeWithLogging(
      query,
      `findMany:${tableName}`,
      { filters }
    );
  }

  async findFirst<T>(
    query: () => Promise<T | undefined>,
    tableName: string,
    filters?: Record<string, any>
  ): Promise<T | undefined> {
    return this.executeWithLogging(
      query,
      `findFirst:${tableName}`,
      { filters }
    );
  }

  async create<T>(
    query: () => Promise<T>,
    tableName: string,
    data?: Record<string, any>
  ): Promise<T> {
    return this.executeWithLogging(
      query,
      `create:${tableName}`,
      { hasData: !!data }
    );
  }

  async update<T>(
    query: () => Promise<T>,
    tableName: string,
    filters?: Record<string, any>
  ): Promise<T> {
    return this.executeWithLogging(
      query,
      `update:${tableName}`,
      { filters }
    );
  }

  async delete<T>(
    query: () => Promise<T>,
    tableName: string,
    filters?: Record<string, any>
  ): Promise<T> {
    return this.executeWithLogging(
      query,
      `delete:${tableName}`,
      { filters }
    );
  }

  // Get pool statistics (similar to Prisma's metrics)
  getPoolStats() {
    const stats = {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };

    this.logger.debug('Database pool statistics', {
      context: 'DrizzleService',
      ...stats,
    });

    return stats;
  }
}