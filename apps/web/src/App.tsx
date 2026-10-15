import type { Fixture } from '@rep-counter/core';
import { useMemo, useState } from 'react';
import { ApiError, createApiClient } from './data/apiClient';
import { buildSession, type BuiltSession } from './logic/buildSession';
import { useSessions } from './logic/useSessions';
import { AnalysisView } from './ui/AnalysisView';
import { FilePicker } from './ui/FilePicker';
import { SessionsList } from './ui/SessionsList';
import { UserSwitcher } from './ui/UserSwitcher';
import { USERS, type User } from './users';

interface Loaded {
  name: string;
  fixture: Fixture;
  built: BuiltSession;
}

export function App() {
  const [user, setUser] = useState<User>('alice');
  const api = useMemo(() => createApiClient(USERS[user]), [user]);
  const { sessions, loading, error, save } = useSessions(api);

  const [loaded, setLoaded] = useState<Loaded>();
  const [fileError, setFileError] = useState<string>();
  const [saveMessage, setSaveMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  function onUserChange(next: User) {
    // A built session belongs to the user who loaded it; start clean for the next user.
    setUser(next);
    setLoaded(undefined);
    setSaveMessage(undefined);
    setFileError(undefined);
  }

  function onLoad(name: string, fixture: Fixture) {
    setFileError(undefined);
    setSaveMessage(undefined);
    setLoaded({ name, fixture, built: buildSession(fixture, new Date(), () => crypto.randomUUID()) });
  }

  async function onSave() {
    if (!loaded) return;
    setSaving(true);
    try {
      const status = await save(loaded.built.session);
      setSaveMessage(status === 201 ? 'Saved.' : 'Already saved, kept the first copy.');
    } catch (e) {
      setSaveMessage(e instanceof ApiError ? `Not saved (${e.status}): ${e.message}` : 'Not saved: network error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <header>
        <h1>Rep Counter</h1>
        <UserSwitcher user={user} onChange={onUserChange} />
      </header>

      <section>
        <h2>1. Pick a session file</h2>
        <FilePicker onLoad={onLoad} onError={setFileError} />
        {fileError && <p className="error">{fileError}</p>}
      </section>

      {loaded && (
        <section>
          <h2>2. Reps in {loaded.name}</h2>
          <AnalysisView
            angles={loaded.fixture.angles}
            reps={loaded.built.analysis.reps}
            repEndFrames={loaded.built.analysis.repEndFrames}
            expectedReps={loaded.fixture.expectedReps}
          />
          <div className="save">
            <button type="button" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save session'}
            </button>
            <span className="muted">
              Sends only {loaded.built.session.reps} reps, {loaded.built.session.durationSec} s, the time and an id.
            </span>
          </div>
          {saveMessage && <p>{saveMessage}</p>}
        </section>
      )}

      <section>
        <h2>{loaded ? '3.' : '2.'} My sessions</h2>
        <SessionsList sessions={sessions} loading={loading} error={error} />
      </section>
    </main>
  );
}
