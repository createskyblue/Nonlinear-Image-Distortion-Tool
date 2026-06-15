import type { OffsetOptions } from './offset'

export const PERSISTED_SETTINGS_KEY = 'nonlinear-offset-settings-v2'

export type PersistedSettings = {
  mode: 'scramble' | 'restore'
  offset: OffsetOptions
}

type PersistedSettingsPayload = PersistedSettings & {
  v: 2
}

function isMode(value: unknown): value is PersistedSettings['mode'] {
  return value === 'scramble' || value === 'restore'
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPersistedSettingsPayload(value: unknown): value is PersistedSettingsPayload {
  if (typeof value !== 'object' || value === null) return false
  const payload = value as Record<string, unknown>
  if (payload.v !== 2 || !isMode(payload.mode)) return false
  const offset = payload.offset as Record<string, unknown> | undefined
  return (
    typeof offset === 'object' &&
    offset !== null &&
    typeof offset.key === 'string' &&
    offset.key.trim().length > 0 &&
    isFiniteNumber(offset.amplitude) &&
    isFiniteNumber(offset.cellSize) &&
    isFiniteNumber(offset.swirl)
  )
}

export function encodePersistedSettings(settings: PersistedSettings): string {
  return JSON.stringify({
    v: 2,
    ...settings,
  } satisfies PersistedSettingsPayload)
}

export function decodePersistedSettings(value: string | null): PersistedSettings | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (!isPersistedSettingsPayload(parsed)) return null
    return {
      mode: parsed.mode,
      offset: {
        key: parsed.offset.key,
        amplitude: parsed.offset.amplitude,
        cellSize: parsed.offset.cellSize,
        swirl: parsed.offset.swirl,
      },
    }
  } catch {
    return null
  }
}
