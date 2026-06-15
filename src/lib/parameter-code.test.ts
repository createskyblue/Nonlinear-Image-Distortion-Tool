import { describe, expect, it } from 'vitest'
import { decodeParameterCode, encodeParameterCode } from './parameter-code'

describe('parameter code', () => {
  it('round trips offset parameters through a base64 code', () => {
    const code = encodeParameterCode({
      key: 'owner-a',
      amplitude: 2,
      cellSize: 10,
      swirl: 0.25,
    })

    expect(code).toMatch(/^NO3:/)
    expect(decodeParameterCode(code)).toEqual({
      algorithm: 'smooth-grid',
      key: 'owner-a',
      amplitude: 2,
      cellSize: 10,
      swirl: 0.25,
    })
  })

  it('keeps old NO2 parameter codes on the legacy algorithm', () => {
    const legacyPayload = btoa(JSON.stringify({
      v: 2,
      key: 'legacy-owner',
      amplitude: 3,
      cellSize: 12,
      swirl: 0.4,
    }))

    expect(decodeParameterCode(`NO2:${legacyPayload}`)).toEqual({
      algorithm: 'legacy-grid',
      key: 'legacy-owner',
      amplitude: 3,
      cellSize: 12,
      swirl: 0.4,
    })
  })

  it('rejects invalid parameter codes', () => {
    expect(() => decodeParameterCode('bad-code')).toThrow('参数码无效')
    expect(() => decodeParameterCode('NO2:bm90IGpzb24=')).toThrow('参数码无效')
  })
})
