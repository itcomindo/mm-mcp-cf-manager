import type {
  AppearanceSettings,
  AppSettings,
  BehaviorSettings,
} from '@shared/schemas/settings.schema'
import { SIDEBAR_WIDTH_DEFAULT_PX } from '@shared/schemas/settings.schema'
import type { DatabaseService } from '../persistence/database.service'

export class SettingsService {
  constructor(private database: DatabaseService) {}

  getAll(): AppSettings {
    return this.database.getAppSettings()
  }

  updateAppearance(partial: Partial<AppearanceSettings>): AppSettings {
    return this.database.updateAppSettings((current) => ({
      ...current,
      appearance: { ...current.appearance, ...partial },
    }))
  }

  updateBehavior(partial: Partial<BehaviorSettings>): AppSettings {
    return this.database.updateAppSettings((current) => ({
      ...current,
      behavior: { ...current.behavior, ...partial },
    }))
  }

  saveWindowBounds(bounds: AppSettings['windowBounds']): AppSettings {
    return this.database.updateAppSettings((current) => ({
      ...current,
      windowBounds: bounds,
    }))
  }

  resetUiPreferences(): AppSettings {
    return this.database.updateAppSettings((current) => ({
      ...current,
      appearance: {
        theme: 'system',
        fontSize: 'md',
        sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT_PX,
      },
    }))
  }
}
