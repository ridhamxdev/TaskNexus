import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params, headers } = request;
    const now = Date.now();

    // Log request details
    this.logger.log(
      `Incoming Request:\n` +
      `Method: ${method}\n` +
      `URL: ${url}\n` +
      `Headers: ${JSON.stringify(headers)}\n` +
      `Body: ${JSON.stringify(body)}\n` +
      `Query: ${JSON.stringify(query)}\n` +
      `Params: ${JSON.stringify(params)}`
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const delay = Date.now() - now;
          
          this.logger.log(
            `Response:\n` +
            `Status: ${response.statusCode}\n` +
            `Time: ${delay}ms\n` +
            `Data: ${JSON.stringify(data)}`
          );
        },
        error: (error) => {
          const delay = Date.now() - now;
          this.logger.error(
            `Error Response:\n` +
            `Status: ${error.status || 500}\n` +
            `Time: ${delay}ms\n` +
            `Error: ${error.message}\n` +
            `Stack: ${error.stack}`
          );
        }
      }),
    );
  }
} 