import { USERS, type User } from '../users';

interface Props {
  user: User;
  onChange(user: User): void;
}

export function UserSwitcher({ user, onChange }: Props) {
  return (
    <label className="user">
      Signed in as{' '}
      <select value={user} onChange={(e) => onChange(e.target.value as User)}>
        {Object.keys(USERS).map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </label>
  );
}
