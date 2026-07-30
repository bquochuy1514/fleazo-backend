/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

interface ValidationError {
  property: string;
  constraints?: Record<string, string>;
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const exceptionResponse = exception.getResponse() as {
      message: string | ValidationError[];
      errorCode?: string;
    };

    if (Array.isArray(exceptionResponse.message)) {
      const errors: Record<string, string> = {};

      (exceptionResponse.message as ValidationError[]).forEach((error) => {
        if (error.property && error.constraints) {
          errors[error.property] = Object.values(error.constraints)[0];
        }
      });

      return response.status(400).json({
        statusCode: 400,
        message: 'Validation failed',
        errors,
      });
    }

    return response.status(400).json({
      statusCode: 400,
      message: exceptionResponse.message,
      ...(exceptionResponse.errorCode && {
        errorCode: exceptionResponse.errorCode,
      }),
    });
  }
}
