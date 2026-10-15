import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { TOKENS, type TokenMap } from './tokens';

export type AuthedRequest = Request & { userId: string };

/** Every route: Bearer token -> userId on the request, otherwise 401. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(TOKENS) private readonly tokens: TokenMap) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const match = /^Bearer (.+)$/.exec(request.headers.authorization ?? '');
    const userId = match && Object.hasOwn(this.tokens, match[1]) ? this.tokens[match[1]] : undefined;
    if (!userId) {
      throw new UnauthorizedException({ error: 'unauthorized', message: 'Missing or unknown Bearer token' });
    }
    request.userId = userId;
    return true;
  }
}
