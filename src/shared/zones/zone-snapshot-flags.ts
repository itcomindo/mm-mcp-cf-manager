export type ZoneSnapshotFlags = {
  developmentMode: boolean | null
  underAttackMode: boolean | null
}

const EMPTY: ZoneSnapshotFlags = {
  developmentMode: null,
  underAttackMode: null,
}

function readBoolean(value: unknown): boolean | null {
  if (value === true || value === false) {
    return value
  }
  return null
}

/** Reads dev mode / Under Attack from zones.capabilities_json snapshot (after Refresh Zone). */
export function parseZoneSnapshotFlags(capabilitiesJson: string | null): ZoneSnapshotFlags {
  if (!capabilitiesJson) {
    return EMPTY
  }
  try {
    const parsed = JSON.parse(capabilitiesJson) as {
      snapshot?: {
        developmentMode?: unknown
        underAttackMode?: unknown
      }
    }
    const snap = parsed.snapshot
    if (!snap) {
      return EMPTY
    }
    return {
      developmentMode: readBoolean(snap.developmentMode),
      underAttackMode: readBoolean(snap.underAttackMode),
    }
  } catch {
    return EMPTY
  }
}
