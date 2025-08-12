import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';



@Global()
    @Module({
        imports: [
            WinstonModule.forRoot({
                level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
                format: winston.format.combine(
                    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                    winston.format.errors({ stack: true }),
                    winston.format.printf((info) => {
                        const { timestamp, level, message, context, stack, ...meta } = info as any;
                        
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
                            default:
                                colorizedLevel = level.toUpperCase();
                        }
                        
                        const contextStr = context ? `\x1b[35m[${String(context)}]\x1b[0m ` : ''; // Magenta
                        const timestampStr = `\x1b[90m${String(timestamp)}\x1b[0m`; // Gray
                        const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
                        const stackStr = stack ? `\n${String(stack)}` : '';
                        
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
