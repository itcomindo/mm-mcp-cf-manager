export type IpAccessTarget = 'ip' | 'ip6'

function isIpv4(value: string): boolean {
  const parts = value.split('.')
  if (parts.length !== 4) return false
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false
    const n = Number(part)
    return n >= 0 && n <= 255
  })
}

function isIpv6(value: string): boolean {
  if (!value.includes(':')) return false
  return /^[0-9a-fA-F:]+$/.test(value)
}

export function detectIpAccessTarget(ip: string): IpAccessTarget | null {
  const trimmed = ip.trim()
  if (isIpv4(trimmed)) return 'ip'
  if (isIpv6(trimmed)) return 'ip6'
  return null
}

export function isValidIpAccessAddress(ip: string): boolean {
  return detectIpAccessTarget(ip) !== null
}
