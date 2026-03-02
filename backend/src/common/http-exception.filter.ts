import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

const CONSTRAINT_MESSAGES: Record<string, string> = {
  UQ_users_email: 'A user with this email already exists.',
  UQ_fe0bb3f6520ee0469504521e710: 'A user with this username already exists.',
  UQ_organizations_name: 'An organization with this name already exists.',
};

function parseConstraintMessage(error: QueryFailedError & { constraint?: string; detail?: string }): string | null {
  if (error.constraint) {
    const friendly = CONSTRAINT_MESSAGES[error.constraint];
    if (friendly) return friendly;
  }

  const detail = error.detail || (error as any).driverError?.detail;
  if (typeof detail === 'string') {
    const match = detail.match(/Key \((\w+)\)=\((.+?)\) already exists/);
    if (match) {
      return `A record with this ${match[1].replace(/_/g, ' ')} already exists.`;
    }
  }

  return null;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message;

      if (status >= 500) {
        this.logger.error(
          `[${request.method} ${request.url}] ${status} - ${message}`,
          exception.stack,
        );
      } else {
        this.logger.warn(`[${request.method} ${request.url}] ${status} - ${JSON.stringify(message)}`);
      }

      response.status(status).json(exceptionResponse);
      return;
    }

    if (exception instanceof QueryFailedError) {
      const pgCode = (exception as any).driverError?.code || (exception as any).code;

      // 23505 = unique_violation
      if (pgCode === '23505') {
        const friendly = parseConstraintMessage(exception as any) || 'A record with this value already exists.';
        this.logger.warn(`[${request.method} ${request.url}] 409 - Unique constraint: ${(exception as any).detail || exception.message}`);
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: friendly,
          error: 'Conflict',
        });
        return;
      }

      // 23503 = foreign_key_violation
      if (pgCode === '23503') {
        this.logger.warn(`[${request.method} ${request.url}] 400 - FK violation: ${(exception as any).detail || exception.message}`);
        response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Referenced record does not exist.',
          error: 'Bad Request',
        });
        return;
      }

      // 23502 = not_null_violation
      if (pgCode === '23502') {
        const column = (exception as any).column || 'unknown';
        this.logger.warn(`[${request.method} ${request.url}] 400 - Not null: ${column}`);
        response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Required field "${column}" is missing.`,
          error: 'Bad Request',
        });
        return;
      }
    }

    const error = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(
      `[${request.method} ${request.url}] Unhandled exception: ${error.message}`,
      error.stack,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}