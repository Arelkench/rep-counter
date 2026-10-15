import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { loadTokens, TOKENS } from './auth/tokens';
import { SessionService } from './sessions/session.service';
import { SESSION_STORE } from './sessions/session.store';
import { SessionsController } from './sessions/sessions.controller';
import { SqliteSessionStore } from './sessions/sqlite-session.store';

@Module({
  controllers: [SessionsController],
  providers: [
    SessionService,
    { provide: TOKENS, useFactory: () => loadTokens() },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: SESSION_STORE, useFactory: () => new SqliteSessionStore(process.env.DB_PATH ?? 'data/rep-counter.sqlite') },
  ],
})
export class AppModule {}
