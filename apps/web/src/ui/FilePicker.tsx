import { FixtureSchema, type Fixture } from '@rep-counter/core';
import clean from '../../../../fixtures/session-clean.json';
import noisy from '../../../../fixtures/session-noisy.json';
import shallow from '../../../../fixtures/session-shallow.json';

const BUNDLED: Record<string, unknown> = {
  'session-clean.json': clean,
  'session-noisy.json': noisy,
  'session-shallow.json': shallow,
};

interface Props {
  onLoad(name: string, fixture: Fixture): void;
  onError(message: string): void;
}

export function FilePicker({ onLoad, onError }: Props) {
  function accept(name: string, data: unknown) {
    const parsed = FixtureSchema.safeParse(data);
    if (parsed.success) onLoad(name, parsed.data);
    else onError(`${name} is not a session file: it needs sampleRateHz and a list of angles.`);
  }

  async function openFile(file: File | undefined) {
    if (!file) return;
    try {
      accept(file.name, JSON.parse(await file.text()));
    } catch {
      onError(`${file.name} is not valid JSON.`);
    }
  }

  return (
    <div className="picker">
      {Object.entries(BUNDLED).map(([name, data]) => (
        <button key={name} type="button" onClick={() => accept(name, data)}>
          {name.replace('session-', '').replace('.json', '')}
        </button>
      ))}
      <label className="file">
        Open file…
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            void openFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}
