import {
  defaultZoneCapabilities,
  type ZoneCapabilities,
} from '@shared/schemas/capabilities.schema'
import type { DatabaseService } from '../persistence/database.service'

export function readZoneCapabilities(
  database: DatabaseService,
  zoneId: string,
): ZoneCapabilities {
  const zone = database.getZoneById(zoneId)
  if (!zone?.capabilitiesJson) return defaultZoneCapabilities()
  try {
    const parsed = JSON.parse(zone.capabilitiesJson) as { capabilities?: ZoneCapabilities }
    return { ...defaultZoneCapabilities(), ...parsed.capabilities }
  } catch {
    return defaultZoneCapabilities()
  }
}
