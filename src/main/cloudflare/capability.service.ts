import { capabilityFromProbe } from '@shared/capabilities/map-http-to-capability'
import {
  defaultZoneCapabilities,
  type CapabilityKey,
  type ZoneCapabilities,
} from '@shared/schemas/capabilities.schema'

type ProbeSet = {
  devSuccess?: boolean
  devStatus?: number
  secSuccess?: boolean
  secStatus?: number
  sslSuccess?: boolean
  sslStatus?: number
  dnsSuccess?: boolean
  dnsStatus?: number
  wafSuccess?: boolean
  wafStatus?: number
}

export class CapabilityService {
  mergeFromProbes(current: ZoneCapabilities, probes: ProbeSet): ZoneCapabilities {
    const next: ZoneCapabilities = { ...defaultZoneCapabilities(), ...current }

    const apply = (key: CapabilityKey, success?: boolean, status?: number): void => {
      next[key] = capabilityFromProbe(Boolean(success), status)
    }

    if (probes.devSuccess !== undefined) {
      apply('devModeRead', probes.devSuccess, probes.devStatus)
      apply('devModeWrite', probes.devSuccess, probes.devStatus)
    }
    if (probes.secSuccess !== undefined) {
      apply('securityRead', probes.secSuccess, probes.secStatus)
      apply('securityWrite', probes.secSuccess, probes.secStatus)
    }
    if (probes.dnsSuccess !== undefined) {
      apply('dnsRead', probes.dnsSuccess, probes.dnsStatus)
      apply('dnsWrite', probes.dnsSuccess, probes.dnsStatus)
    }
    if (probes.wafSuccess !== undefined) {
      apply('wafRead', probes.wafSuccess, probes.wafStatus)
      apply('wafWrite', probes.wafSuccess, probes.wafStatus)
    }

    if (probes.devSuccess && probes.secSuccess) {
      next.cachePurge = next.cachePurge === 'unknown' ? 'available' : next.cachePurge
    }

    return next
  }
}
