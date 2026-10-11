export type ResourceScope = 'cache' | 'dns' | 'security' | 'waf'

export class ResourceLockService {
  private locks = new Set<string>()

  private key(zoneId: string, scope: ResourceScope): string {
    return `${zoneId}:${scope}`
  }

  tryAcquire(zoneId: string, scope: ResourceScope): boolean {
    const lockKey = this.key(zoneId, scope)
    if (this.locks.has(lockKey)) return false
    this.locks.add(lockKey)
    return true
  }

  release(zoneId: string, scope: ResourceScope): void {
    this.locks.delete(this.key(zoneId, scope))
  }

  isLocked(zoneId: string, scope: ResourceScope): boolean {
    return this.locks.has(this.key(zoneId, scope))
  }
}
