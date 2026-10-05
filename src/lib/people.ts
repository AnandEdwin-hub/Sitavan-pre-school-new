type PeopleTable = 'students' | 'staff' | 'volunteers';

let currentRole: string | null = null;

export function setCurrentRole(role: string | null) {
  currentRole = role;
}

// Viewers (donors) read the masked views; admin and staff read the real tables.
export function peopleTable<T extends PeopleTable>(name: T): T {
  return (currentRole === 'viewer' ? `${name}_masked` : name) as T;
}