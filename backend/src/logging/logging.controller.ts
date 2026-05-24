import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';

@ApiExcludeController() // Hides this controller from the Swagger UI
@Controller('logs')
export class LoggingController {
  private readonly logger = new Logger('Frontend');

  /**
   * Receives log messages from the frontend client and writes them to the backend logger.
   * This is a "fire-and-forget" endpoint that returns 204 No Content.
   * @param log A log object containing level, message, and optional context.
   */
  @ApiOperation({ summary: 'Endpoint for frontend to send logs to the backend.', description: 'This is an internal endpoint and not intended for public use.' })
  @Post()
  @HttpCode(204) // No Content
  logMessage(@Body() log: { level: string; message: string; context?: Record<string, unknown> }) {
    const { level, message, context } = log;
    const ctx = context ?? {};

    if (level === 'error') {
      const stack = typeof ctx.stack === 'string' ? ctx.stack : undefined;
      const rest = { ...ctx };
      delete rest.stack;
      const detail =
        Object.keys(rest).length > 0 ? `${message} ${JSON.stringify(rest)}` : message;
      this.logger.error(detail, stack);
      return;
    }
    if (level === 'warn') {
      this.logger.warn(`${message} ${JSON.stringify(ctx)}`);
      return;
    }
    this.logger.log(`${message} ${JSON.stringify(ctx)}`);
  }
}