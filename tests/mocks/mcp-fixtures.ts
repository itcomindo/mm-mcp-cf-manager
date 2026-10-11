export const whoamiUserFixture = {
  type: 'user',
  user: { id: 'user-1', email: 'admin@example.com' },
}

export const zonePageOneFixture = {
  ok: true,
  zones: [
    { id: 'zone-a', name: 'a.example', status: 'active', plan: { name: 'Free Website' } },
    { id: 'zone-b', name: 'b.example', status: 'active', plan: { name: 'Pro' } },
  ],
}

export const zonePageTwoFixture = {
  ok: true,
  zones: [{ id: 'zone-c', name: 'c.example', status: 'active', plan: { name: 'Free' } }],
}
