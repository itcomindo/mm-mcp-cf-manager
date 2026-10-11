import { z } from 'zod'

export const capabilityStateSchema = z.enum([
  'available',
  'unavailable',
  'permission_missing',
  'plan_restricted',
  'unknown',
  'loading',
])

export const capabilityKeySchema = z.enum([
  'dnsRead',
  'dnsWrite',
  'cachePurge',
  'devModeRead',
  'devModeWrite',
  'securityRead',
  'securityWrite',
  'wafRead',
  'wafWrite',
])

export const zoneCapabilitiesSchema = z.record(z.string(), capabilityStateSchema)

export type CapabilityState = z.infer<typeof capabilityStateSchema>
export type CapabilityKey = z.infer<typeof capabilityKeySchema>
export type ZoneCapabilities = Partial<Record<CapabilityKey, CapabilityState>>

export const defaultZoneCapabilities = (): ZoneCapabilities => ({
  dnsRead: 'unknown',
  dnsWrite: 'unknown',
  cachePurge: 'unknown',
  devModeRead: 'unknown',
  devModeWrite: 'unknown',
  securityRead: 'unknown',
  securityWrite: 'unknown',
  wafRead: 'unknown',
  wafWrite: 'unknown',
})
