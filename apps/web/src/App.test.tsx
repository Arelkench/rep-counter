// @vitest-environment jsdom
import type { StoredSession } from '@rep-counter/core';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { ApiError, type ApiClient } from './data/apiClient';

afterEach(cleanup);

/** In-memory stand-in for the API with the same rules: 201, then 200 for the owner, 409 for anyone else. */
function fakeServer() {
  const rows = new Map<string, { token: string; session: StoredSession }>();
  const createApi = (token: string): ApiClient => ({
    async save(session) {
      const existing = rows.get(session.sessionId);
      if (!existing) {
        const stored = { ...session, createdAt: new Date().toISOString() };
        rows.set(session.sessionId, { token, session: stored });
        return { status: 201, session: stored };
      }
      if (existing.token === token) return { status: 200, session: existing.session };
      throw new ApiError(409, 'sessionId already exists with different data');
    },
    async list() {
      return [...rows.values()].filter((r) => r.token === token).map((r) => r.session);
    },
  });
  return { rows, createApi };
}

const status = () => screen.getByRole('status');
const dataRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

describe('App', () => {
  it('counts the picked fixture in the browser and compares with the expected count', async () => {
    render(<App createApi={fakeServer().createApi} />);
    fireEvent.click(screen.getByRole('button', { name: 'noisy' }));
    expect(screen.getByText(/Counted/).textContent).toBe('Counted 8, expected 8 ✓');
    expect(screen.getByRole('img', { name: /8 reps/ })).toBeTruthy();
  });

  it('saves once: a repeat says "already saved" and the list keeps one row', async () => {
    const server = fakeServer();
    render(<App createApi={server.createApi} />);
    fireEvent.click(screen.getByRole('button', { name: 'shallow' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save session' }));
    await waitFor(() => expect(status().textContent).toBe('Saved.'));
    expect(dataRows()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Save session' }));
    await waitFor(() => expect(status().textContent).toBe('Already saved, kept the first copy.'));
    expect(dataRows()).toHaveLength(1);
    expect(server.rows.size).toBe(1);
  });

  it("switching user clears the loaded file and shows that user's own list", async () => {
    const server = fakeServer();
    render(<App createApi={server.createApi} />);
    fireEvent.click(screen.getByRole('button', { name: 'clean' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save session' }));
    await waitFor(() => expect(dataRows()).toHaveLength(1));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bob' } });
    expect(screen.queryByText(/Reps in/)).toBeNull();
    expect(await screen.findByText('No sessions yet.')).toBeTruthy();
  });

  it('explains a file that is not valid JSON', async () => {
    render(<App createApi={fakeServer().createApi} />);
    const input = screen.getByLabelText('Open file…') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['{broken'], 'broken.json')] } });
    expect((await screen.findByRole('alert')).textContent).toBe('broken.json is not valid JSON.');
  });

  it('explains a JSON file that is not a session', async () => {
    render(<App createApi={fakeServer().createApi} />);
    const input = screen.getByLabelText('Open file…') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['{"hello": 1}'], 'other.json')] } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/other\.json is not a session file/);
  });

  it.each([
    ['a server error', new ApiError(500, 'Something went wrong'), 'Not saved (500): Something went wrong'],
    ['no connection', new TypeError('Failed to fetch'), 'Not saved: network error.'],
  ])('tells the user when saving fails with %s', async (_, failure, message) => {
    const failing = (): ApiClient => ({ save: () => Promise.reject(failure), list: async () => [] });
    render(<App createApi={failing} />);
    fireEvent.click(screen.getByRole('button', { name: 'clean' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save session' }));
    await waitFor(() => expect(status().textContent).toBe(message));
  });
});
