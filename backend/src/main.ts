import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

require("dotenv").config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule,
    {
        logger: ['error', 'warn']
    }
  );
  app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:8080', // Your drone service's URL
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe());
  // TODO winston, exception handling, 
  
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
