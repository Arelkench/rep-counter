import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  // Own variable, not PORT: tools that set PORT for the web dev server must not move the API.
  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  console.log(`API on http://localhost:${port}`);
}

void bootstrap();
