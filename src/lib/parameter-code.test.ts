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

    expect(code).toMatch(/^NO2:/)
    expect(decodeParameterCode(code)).toEqual({
      key: 'owner-a',
      amplitude: 2,
      cellSize: 10,
      swirl: 0.25,
    })
  })

  it('rejects invalid parameter codes', () => {
    expect(() => decodeParameterCode('bad-code')).toThrow('参数码无效')
    expect(() => decodeParameterCode('NO2:bm90IGpzb24=')).toThrow('参数码无效')
  })
})
