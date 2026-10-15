import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthedRequest } from './auth.guard';

/** The userId the AuthGuard resolved from the token. */
export const UserId = createParamDecorator(
  (_: unknown, context: ExecutionContext): string => context.switchToHttp().getRequest<AuthedRequest>().userId,
);
