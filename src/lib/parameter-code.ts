import type { OffsetOptions } from './offset'

const LEGACY_PREFIX = 'NO2:'
const PREFIX = 'NO3:'

type LegacyEncodedParameterCode = {
  v: 2
  key: string
  amplitude: number
  cellSize: number
  swirl: number
}

type EncodedParameterCode = {
  v: 3
  algorithm: NonNullable<OffsetOptions['algorithm']>
  key: string
  amplitude: number
  cellSize: number
  swirl: number
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function fromBase64Url(value: string): string {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

function assertValidLegacyPayload(value: unknown): asserts value is LegacyEncodedParameterCode {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('v' in value) ||
    !('key' in value) ||
    !('amplitude' in value) ||
    !('cellSize' in value) ||
    !('swirl' in value)
  ) {
    throw new Error('参数码无效')
  }

  const payload = value as Record<string, unknown>
  if (
    payload.v !== 2 ||
    typeof payload.key !== 'string' ||
    typeof payload.amplitude !== 'number' ||
    typeof payload.cellSize !== 'number' ||
    typeof payload.swirl !== 'number' ||
    payload.key.trim().length === 0 ||
    !Number.isFinite(payload.amplitude) ||
    !Number.isFinite(payload.cellSize) ||
    !Number.isFinite(payload.swirl)
  ) {
    throw new Error('参数码无效')
  }
}

function assertValidPayload(value: unknown): asserts value is EncodedParameterCode {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('v' in value) ||
    !('algorithm' in value) ||
    !('key' in value) ||
    !('amplitude' in value) ||
    !('cellSize' in value) ||
    !('swirl' in value)
  ) {
    throw new Error('参数码无效')
  }

  const payload = value as Record<string, unknown>
  if (
    payload.v !== 3 ||
    (payload.algorithm !== 'smooth-grid' && payload.algorithm !== 'legacy-grid') ||
    typeof payload.key !== 'string' ||
    typeof payload.amplitude !== 'number' ||
    typeof payload.cellSize !== 'number' ||
    typeof payload.swirl !== 'number' ||
    payload.key.trim().length === 0 ||
    !Number.isFinite(payload.amplitude) ||
    !Number.isFinite(payload.cellSize) ||
    !Number.isFinite(payload.swirl)
  ) {
    throw new Error('参数码无效')
  }
}

export function encodeParameterCode(options: OffsetOptions): string {
  const payload: EncodedParameterCode = {
    v: 3,
    algorithm: options.algorithm ?? 'smooth-grid',
    key: options.key,
    amplitude: options.amplitude,
    cellSize: options.cellSize,
    swirl: options.swirl,
  }
  return `${PREFIX}${toBase64Url(JSON.stringify(payload))}`
}

export function decodeParameterCode(code: string): OffsetOptions {
  try {
    const trimmed = code.trim()
    if (trimmed.startsWith(LEGACY_PREFIX)) {
      const payload = JSON.parse(fromBase64Url(trimmed.slice(LEGACY_PREFIX.length))) as unknown
      assertValidLegacyPayload(payload)
      return {
        algorithm: 'legacy-grid',
        key: payload.key,
        amplitude: payload.amplitude,
        cellSize: payload.cellSize,
        swirl: payload.swirl,
      }
    }
    if (!trimmed.startsWith(PREFIX)) {
      throw new Error('参数码无效')
    }
    const payload = JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length))) as unknown
    assertValidPayload(payload)
    return {
      algorithm: payload.algorithm,
      key: payload.key,
      amplitude: payload.amplitude,
      cellSize: payload.cellSize,
      swirl: payload.swirl,
    }
  } catch {
    throw new Error('参数码无效')
  }
}
