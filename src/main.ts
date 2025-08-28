import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  // Create app with minimal logging during bootstrap
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  // Enable CORS for frontend integration
  app.enableCors();

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
  }));

  // Swagger API Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('HD Wallet & Vault API')
    .setDescription('A comprehensive API for managing hierarchical deterministic wallets with HashiCorp Vault integration for secure key storage and encryption services.')
    .setVersion('1.0.0')
    .addTag('wallet', 'HD Wallet management operations for creating, restoring, and managing Bitcoin wallets')
    .addTag('vault', 'HashiCorp Vault operations for secret management, encryption, and secure storage')
    .addTag('health', 'System health and status monitoring endpoints')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    }, 'JWT-auth')
    .addApiKey({
      type: 'apiKey',
      name: 'X-Vault-Token',
      in: 'header',
      description: 'Vault authentication token',
    }, 'vault-token')
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.hdwallet.example.com', 'Production server')
    .setContact('Development Team', 'https://github.com/your-org/hdwallet', 'dev@example.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  // Setup Swagger UI
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
    customSiteTitle: 'HD Wallet & Vault API Documentation',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger API documentation is available at: http://localhost:${port}/api-docs`);
  logger.log(`Swagger API documentation is available at: http://localhost:${port}/api-docs`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
