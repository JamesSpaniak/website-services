import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule,
    {
        logger: ['error', 'warn']
    }
  );
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());
  // TODO winston, exception handling, 
  
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
