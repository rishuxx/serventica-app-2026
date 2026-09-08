import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '@serventica/types';

/**
 * SERVENTICA — Global HTTP Exception Filter
 * Ensures every error returned across API boundaries is typed, safe, and traceable.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) || `req_${Date.now()}`;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorMessage =
      typeof message === 'object' && (message as any).message
        ? Array.isArray((message as any).message)
          ? (message as any).message.join(', ')
          : (message as any).message
        : typeof message === 'string'
        ? message
        : 'Unexpected system exception';

    const errorPayload: ApiErrorResponse = {
      code: `ERR_${status}`,
      message: errorMessage,
      requestId,
      statusCode: status,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(
      `[${requestId}] ${request.method} ${request.url} - Status: ${status} - Error: ${errorMessage}`
    );

    response.status(status).json(errorPayload);
  }
}
