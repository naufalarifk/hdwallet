import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable global validation with class-validator
  app.useGlobalPipes(new ValidationPipe({
    transform: true, // Enable auto-transformation with class-transformer
    whitelist: true, // Strip properties that don't have any decorators
    forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
    disableErrorMessages: process.env.NODE_ENV === 'production', // Disable detailed error messages in production
  }));

  const logger = app.get(WINSTON_MODULE_PROVIDER);
  app.useLogger(logger);
  
  await app.listen(3000);
  
  const url = await app.getUrl();
  logger.log(`Application is running on: ${url}`, 'Bootstrap');
}
bootstrap().catch(err=> console.error(err))
