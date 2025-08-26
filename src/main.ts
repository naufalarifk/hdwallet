import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false
  });
  
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
  }));

  const logger = app.get(WINSTON_MODULE_PROVIDER);
  app.useLogger(logger);
  
  await app.listen(3000);
  
  const url = await app.getUrl();
  logger.log(`Application is running on: ${url}`, 'Bootstrap');
}
bootstrap().catch(err=> console.error(err))
