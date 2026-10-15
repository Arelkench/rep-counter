import { Body, ConflictException, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { SessionSchema, type Session, type StoredSession } from '@rep-counter/core';
import type { Response } from 'express';
import { UserId } from '../auth/user-id.decorator';
import { SessionService } from './session.service';
import { ZodValidationPipe } from './zod-validation.pipe';

/** Turns the service answer into an HTTP reply. The only place that knows status codes. */
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionService) {}

  @Post()
  async save(
    @UserId() userId: string,
    @Body(new ZodValidationPipe(SessionSchema)) body: Session,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StoredSession> {
    const outcome = await this.sessions.save(userId, body);
    switch (outcome.kind) {
      case 'created':
        res.status(HttpStatus.CREATED);
        return outcome.session;
      case 'replayed':
        res.status(HttpStatus.OK);
        return outcome.session;
      case 'conflict':
        throw new ConflictException({
          error: 'conflict',
          message: `sessionId ${body.sessionId} already exists with different data`,
        });
    }
  }

  @Get()
  async list(@UserId() userId: string): Promise<{ items: StoredSession[] }> {
    return { items: await this.sessions.list(userId) };
  }
}
