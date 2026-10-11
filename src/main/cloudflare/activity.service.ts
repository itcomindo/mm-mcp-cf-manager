import type { ActivityEntry, ActivityListResult } from '@shared/schemas/activity.schema'
import type { ActivityStatus } from '@shared/schemas/activity.schema'
import type { DatabaseService } from '../persistence/database.service'

export class ActivityService {
  constructor(private database: DatabaseService) {}

  record(input: {
    zoneId: string
    domain: string
    action: string
    target?: string | null
    previousValue?: string | null
    newValue?: string | null
    status: ActivityStatus
    source?: 'single' | 'bulk'
    taskId?: string | null
    errorSummary?: string | null
  }): ActivityEntry {
    return this.database.insertActivity(input)
  }

  listForZone(zoneId: string, limit?: number): ActivityListResult {
    return { entries: this.database.listActivityForZone(zoneId, limit ?? 100) }
  }
}
