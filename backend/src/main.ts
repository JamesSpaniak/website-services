import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { LoggingInterceptor } from './common/logging.interceptor';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as WinstonCloudWatch from 'winston-cloudwatch';
import { getNamespace } from 'cls-hooked';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

require("dotenv").config();

async function bootstrap() {
  // A custom formatter to add the request ID to the log info object.
  // This will be applied globally to all logs.
  const requestIdFormat = winston.format((info) => {
    const ns = getNamespace('app-namespace');
    const requestId = ns && ns.active ? ns.get('requestId') : undefined;
    if (requestId) {
      info.requestId = requestId;
    }
    return info;
  });

  const transports: winston.transport[] = [
    // Console transport with a simple, colorized format for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.ms(),
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, ms, context, requestId }) => {
            const requestIdStr = requestId ? `[${requestId}]` : '';
            return `${timestamp} ${level} ${requestIdStr} [${context || 'App'}]: ${message} ${ms}`;
          },
        ),
      ),
    }),
    // File transports for structured JSON logging with rotation
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true, // Zip old log files
      maxSize: '20m',      // Rotate if file size exceeds 20MB
      maxFiles: '14d',     // Keep logs for 14 days
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ];

  // Add CloudWatch transport only in production environments
  if (process.env.NODE_ENV === 'production') {
    transports.push(
      new WinstonCloudWatch({
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: `${process.env.CLOUDWATCH_LOG_STREAM_NAME}-${Date.now()}`,
        awsRegion: process.env.AWS_REGION,
        jsonMessage: true,
      }),
    );
  }

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      // The global format is applied to all logs before they are passed to the transports.
      format: winston.format.combine(
        requestIdFormat(), // Add the requestId to the info object.
      ),
      transports,
    }),
  });

  // This logger instance will now use Winston under the hood
  const logger = new Logger('Bootstrap');

  app.use(cookieParser());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe());
  
  // --- Swagger (OpenAPI) Setup ---
  const config = new DocumentBuilder()
    .setTitle('Drone Website API')
    .setDescription('API documentation for the course and user management system.')
    .setVersion('1.0')
    .addBearerAuth() // This is for JWT authentication
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Remembers the JWT token in the UI
    },
  });

  await app.listen(3000, '0.0.0.0');
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
