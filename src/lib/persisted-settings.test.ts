import { describe, expect, it } from 'vitest'
import { decodePersistedSettings, encodePersistedSettings, type PersistedSettings } from './persisted-settings'

describe('persisted settings', () => {
  it('round trips the current mode and offset parameters', () => {
    const settings: PersistedSettings = {
      mode: 'restore',
      offset: {
        key: 'owner-a',
        amplitude: 2,
        cellSize: 10,
        swirl: 0.35,
      },
    }

    expect(decodePersistedSettings(encodePersistedSettings(settings))).toEqual(settings)
  })

  it('returns null for invalid persisted data', () => {
    expect(decodePersistedSettings('not-json')).toBeNull()
    expect(decodePersistedSettings(JSON.stringify({ v: 2, mode: 'bad' }))).toBeNull()
  })
})
