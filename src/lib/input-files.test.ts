import { describe, expect, it } from 'vitest'
import { getFirstImageFileFromFileList, getFirstImageFileFromItems, hasFileTransfer } from './input-files'

function makeFile(name: string, type: string): File {
  return new File(['x'], name, { type })
}

describe('input files', () => {
  it('finds the first image file from dropped files', () => {
    const image = makeFile('plan.png', 'image/png')
    const files = [makeFile('note.txt', 'text/plain'), image] as unknown as FileList

    expect(getFirstImageFileFromFileList(files)).toBe(image)
  })

  it('finds the first image file from clipboard items', () => {
    const image = makeFile('pasted.png', 'image/png')
    const items = [
      {
        kind: 'string',
        type: 'text/plain',
        getAsFile: () => null,
      },
      {
        kind: 'file',
        type: 'image/png',
        getAsFile: () => image,
      },
    ] as unknown as DataTransferItemList

    expect(getFirstImageFileFromItems(items)).toBe(image)
  })

  it('returns null when no image exists', () => {
    const files = [makeFile('note.txt', 'text/plain')] as unknown as FileList

    expect(getFirstImageFileFromFileList(files)).toBeNull()
  })

  it('accepts drag events that only expose generic file transfer types', () => {
    const transfer = {
      types: ['Files'],
      items: [],
      files: [],
    } as unknown as DataTransfer

    expect(hasFileTransfer(transfer)).toBe(true)
  })
})
