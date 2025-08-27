import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

@Global()
@Module({
    imports: [
        WinstonModule.forRoot({
            levels: winston.config.npm.levels,
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.printf((info) => {
                    const { timestamp, level, message, context, stack, ...meta } = info;

                    // Format the level with colors
                    let colorizedLevel: string;
                    switch (level) {
                        case 'error':
                            colorizedLevel = `\x1b[31m${level.toUpperCase()}\x1b[0m`; // Red
                            break;
                        case 'warn':
                            colorizedLevel = `\x1b[33m${level.toUpperCase()}\x1b[0m`; // Yellow
                            break;
                        case 'info':
                            colorizedLevel = `\x1b[32m${level.toUpperCase()}\x1b[0m`; // Green
                            break;
                        case 'debug':
                            colorizedLevel = `\x1b[36m${level.toUpperCase()}\x1b[0m`; // Cyan
                            break;
                        case 'verbose':
                            colorizedLevel = `\x1b[34m${level.toUpperCase()}\x1b[0m`; // Blue
                            break;
                        case 'http':
                            colorizedLevel = `\x1b[95m${level.toUpperCase()}\x1b[0m`; // Bright Magenta
                            break;
                        case 'silly':
                            colorizedLevel = `\x1b[96m${level.toUpperCase()}\x1b[0m`; // Bright Cyan
                            break;
                        default:
                            colorizedLevel = `\x1b[37m${level.toUpperCase()}\x1b[0m`;
                    }
                    
                    const contextStr = context ? `\x1b[35m[${String(context as string)}]\x1b[0m ` : ''; // Magenta
                    const timestampStr = `\x1b[90m${String(timestamp)}\x1b[0m`; // Gray
                    
                    // Safely handle meta object to avoid circular references
                    let metaStr = '';
                    if (Object.keys(meta).length > 0) {
                        try {
                            metaStr = `\n${JSON.stringify(meta, (key, value) => {
                                // Handle circular references and large objects
                                if (value && typeof value === 'object') {
                                    if (value.constructor && value.constructor.name === 'ClientRequest') {
                                        return '[ClientRequest]';
                                    }
                                    if (value.constructor && value.constructor.name === 'IncomingMessage') {
                                        return '[IncomingMessage]';
                                    }
                                    if (value.constructor && value.constructor.name === 'Socket') {
                                        return '[Socket]';
                                    }
                                }
                                return value;
                            }, 2)}`;
                        } catch {
                            metaStr = `\n[Object with circular references]`;
                        }
                    }
                    const stackStr = stack ? `\n${String(stack as string)}` : '';

                    return `${timestampStr} ${colorizedLevel}: ${contextStr}${String(message)}${metaStr}${stackStr}`;
                })
            ),
            transports: [
                new winston.transports.Console({
                    handleExceptions: true,
                    handleRejections: true,
                }),
                // Optional: Add file transport for production
                ...(process.env.NODE_ENV === 'production' ? [
                    new winston.transports.File({
                        filename: 'logs/error.log',
                        level: 'error',
                        format: winston.format.combine(
                            winston.format.timestamp(),
                            winston.format.json()
                        )
                    }),
                    new winston.transports.File({
                        filename: 'logs/combined.log',
                        format: winston.format.combine(
                            winston.format.timestamp(),
                            winston.format.json()
                        )
                    })
                ] : [])
            ],
        }),
        ConfigModule.forRoot({
            isGlobal: true,
        })
    ]
})
export class CommonModule {}