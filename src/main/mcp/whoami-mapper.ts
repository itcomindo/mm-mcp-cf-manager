import { whoamiIdentitySchema, type ConnectionState } from '@shared/schemas/connection.schema'

export function mapWhoamiToConnectionPatch(raw: unknown): Pick<
  ConnectionState,
  'identityType' | 'identityId' | 'identityLabel' | 'isConnected'
> {
  const parsed = whoamiIdentitySchema.safeParse(raw)
  if (!parsed.success) {
    return {
      isConnected: true,
      identityType: 'unknown',
      identityId: null,
      identityLabel: null,
    }
  }

  const data = parsed.data
  const typeHint = (data.type ?? data.identityType ?? '').toLowerCase()

  if (data.user?.id || typeHint.includes('user')) {
    return {
      isConnected: true,
      identityType: 'user',
      identityId: data.user?.id ?? data.id ?? data.identityId ?? null,
      identityLabel: data.user?.email ?? data.email ?? data.name ?? null,
    }
  }

  if (data.account?.id || typeHint.includes('account')) {
    return {
      isConnected: true,
      identityType: 'account',
      identityId: data.account?.id ?? data.id ?? data.identityId ?? null,
      identityLabel: data.account?.name ?? data.name ?? null,
    }
  }

  return {
    isConnected: true,
    identityType: 'unknown',
    identityId: data.id ?? data.identityId ?? null,
    identityLabel: data.email ?? data.name ?? null,
  }
}
