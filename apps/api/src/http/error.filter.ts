import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

export interface ErrorBody {
  error: string;
  message: string;
}

/** Every error leaves the API as { error, message }. Unexpected errors are logged and never leak details. */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      res.status(status).json(toErrorBody(status, exception.getResponse()));
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'internal', message: 'Something went wrong' });
  }
}

function toErrorBody(status: number, response: string | object): ErrorBody {
  // Our own exceptions already carry { error, message }.
  if (isErrorBody(response)) return { error: response.error, message: response.message };

  // Nest's built-in ones ({ statusCode, message, error: 'Bad Request' }) or a plain string.
  const raw = typeof response === 'string' ? response : (response as { message?: unknown }).message;
  return {
    error: (HttpStatus[status] ?? 'error').toLowerCase(),
    message: Array.isArray(raw) ? raw.join('; ') : typeof raw === 'string' ? raw : 'Request failed',
  };
}

function isErrorBody(value: object | string): value is ErrorBody {
  return (
    typeof value === 'object' &&
    typeof (value as ErrorBody).error === 'string' &&
    typeof (value as ErrorBody).message === 'string' &&
    !('statusCode' in value)
  );
}
