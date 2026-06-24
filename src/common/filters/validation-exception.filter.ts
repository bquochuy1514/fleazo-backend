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
    };

    // Nếu là validation error (message là array)
    if (Array.isArray(exceptionResponse.message)) {
      const errors: Record<string, string> = {};

      (exceptionResponse.message as ValidationError[]).forEach((error) => {
        if (error.property && error.constraints) {
          // Lấy lỗi đầu tiên của mỗi field
          errors[error.property] = Object.values(error.constraints)[0];
        }
      });

      return response.status(400).json({
        statusCode: 400,
        message: 'Validation failed',
        errors,
      });
    }

    // Các BadRequestException khác (không phải validation)
    return response.status(400).json({
      statusCode: 400,
      message: exceptionResponse.message,
    });
  }
}
