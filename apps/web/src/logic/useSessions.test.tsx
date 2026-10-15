// @vitest-environment jsdom
import type { StoredSession } from '@rep-counter/core';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ApiClient } from '../data/apiClient';
import { useSessions } from './useSessions';

afterEach(cleanup);

const stored = (id: string): StoredSession => ({
  sessionId: id,
  reps: 1,
  durationSec: 1,
  performedAt: '2026-10-15T10:00:00.000Z',
  createdAt: '2026-10-15T10:00:00.000Z',
});

describe('useSessions', () => {
  it("ignores a slow reply for the previous user after switching", async () => {
    let finishAlice!: (s: StoredSession[]) => void;
    const alice: ApiClient = {
      list: () => new Promise((resolve) => (finishAlice = resolve)),
      save: () => Promise.reject(new Error('unused')),
    };
    const bob: ApiClient = { list: async () => [stored('bob-1')], save: () => Promise.reject(new Error('unused')) };

    const { result, rerender } = renderHook(({ api }) => useSessions(api), { initialProps: { api: alice } });
    rerender({ api: bob });
    await waitFor(() => expect(result.current.sessions).toEqual([stored('bob-1')]));

    await act(async () => finishAlice([stored('alice-1')])); // arrives late
    expect(result.current.sessions).toEqual([stored('bob-1')]);
  });

  it('reports a failed load as an error', async () => {
    const broken: ApiClient = { list: () => Promise.reject(new Error('offline')), save: async () => ({}) as never };
    const { result } = renderHook(() => useSessions(broken));
    await waitFor(() => expect(result.current.error).toBe('offline'));
    expect(result.current.loading).toBe(false);
  });
});
