import { webcrypto } from 'crypto';

// Node < 19 has no global WebCrypto; @nestjs/schedule calls crypto.randomUUID()
// at boot. Same polyfill as test/jest-e2e.setup.ts. Target runtime is Node 20+.
if (!globalThis.crypto) {
  (globalThis as { crypto: Crypto }).crypto = webcrypto as Crypto;
}

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { seedTestData } from './seed/test-data.seeder';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
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
          ({ level, message, timestamp, ms, context, requestId, stack }) => {
            const requestIdStr = requestId ? `[${requestId}]` : '';
            let line = `${timestamp} ${level} ${requestIdStr} [${context || 'App'}]: ${message} ${ms}`;
            if (stack) {
              line += `\n${stack}`;
            }
            return line;
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
      new WinstonCloudWatch({ // TODO add secrets
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
    bodyParser: false, // disable built-in so we can set a custom limit below
  });

  // The default Express body-parser limit is 100 kb, which is too small for
  // large course payloads. Set to 10 mb; adjust if payloads grow further.
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

  // This logger instance will now use Winston under the hood
  const logger = new Logger('Bootstrap');

  app.use(cookieParser());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      // Strip any body properties not declared on the DTO. Without this,
      // unknown keys flow through to services (mass-assignment risk).
      whitelist: true,
      // Instantiate DTO classes so nested @ValidateNested rules actually run.
      transform: true,
      // Course DTOs use @Expose({groups}) for response serialization; without a
      // matching group the input transform would silently drop those fields.
      transformOptions: { groups: ['COURSE_DETAILS'] },
    }),
  );
  
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

  const dataSource = app.get(DataSource);
  const pending = await dataSource.showMigrations();
  if (pending) {
    logger.log('Running pending database migrations...');
    await dataSource.runMigrations();
    logger.log('Migrations complete.');
  } else {
    logger.log('Database schema is up to date.');
  }

  // Dev-only test fixtures. Gated by an explicit env flag (not NODE_ENV) so the
  // gate lives in per-environment config and survives the future dev/prod split.
  // Seeding is best-effort: a failure here must never block the API from
  // starting (these are convenience fixtures, not required for the app to run).
  if (process.env.SEED_TEST_DATA === 'true') {
    logger.log('SEED_TEST_DATA=true — seeding dev test fixtures...');
    try {
      await seedTestData(dataSource, logger);
    } catch (err) {
      logger.error('Test data seeding failed; continuing startup.', err instanceof Error ? err.stack : String(err));
    }
  }

  await app.listen(3000, '0.0.0.0');
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
