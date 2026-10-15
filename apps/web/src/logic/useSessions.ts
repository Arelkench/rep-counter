import type { Session, StoredSession } from '@rep-counter/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../data/apiClient';

/** Session sync: loads the user's list, saves a session, then reloads the list. */
export function useSessions(api: ApiClient) {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const latest = useRef(0); // ignore replies from a previous user after switching

  const reload = useCallback(async () => {
    const request = ++latest.current;
    setLoading(true);
    setError(undefined);
    try {
      const items = await api.list();
      if (request === latest.current) setSessions(items);
    } catch (e) {
      if (request === latest.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    setSessions([]);
    void reload();
  }, [reload]);

  const save = useCallback(
    async (session: Session): Promise<201 | 200> => {
      const { status } = await api.save(session);
      await reload();
      return status;
    },
    [api, reload],
  );

  return { sessions, loading, error, save };
}
