import { BadRequestException, PipeTransform } from '@nestjs/common';
import { z, type ZodType } from 'zod';

/** Validator: the body must match the schema exactly, otherwise 400. */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({ error: 'invalid_session', message: z.prettifyError(result.error) });
    }
    return result.data;
  }
}
