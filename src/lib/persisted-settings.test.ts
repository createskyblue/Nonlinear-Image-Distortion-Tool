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
      copyResultToClipboard: true,
      language: 'en',
    }

    expect(decodePersistedSettings(encodePersistedSettings(settings))).toEqual(settings)
  })

  it('keeps old v2 settings readable', () => {
    const value = JSON.stringify({
      v: 2,
      mode: 'scramble',
      offset: {
        key: 'old-owner',
        amplitude: 3,
        cellSize: 12,
        swirl: 0.2,
      },
    })

    expect(decodePersistedSettings(value)).toEqual({
      mode: 'scramble',
      offset: {
        key: 'old-owner',
        amplitude: 3,
        cellSize: 12,
        swirl: 0.2,
      },
      copyResultToClipboard: false,
      language: 'zh',
    })
  })

  it('keeps v3 settings readable with Chinese as the default language', () => {
    const value = JSON.stringify({
      v: 3,
      mode: 'restore',
      offset: {
        key: 'v3-owner',
        amplitude: 4,
        cellSize: 16,
        swirl: 0.45,
      },
      copyResultToClipboard: true,
    })

    expect(decodePersistedSettings(value)).toEqual({
      mode: 'restore',
      offset: {
        key: 'v3-owner',
        amplitude: 4,
        cellSize: 16,
        swirl: 0.45,
      },
      copyResultToClipboard: true,
      language: 'zh',
    })
  })

  it('returns null for invalid persisted data', () => {
    expect(decodePersistedSettings('not-json')).toBeNull()
    expect(decodePersistedSettings(JSON.stringify({ v: 2, mode: 'bad' }))).toBeNull()
  })
})
