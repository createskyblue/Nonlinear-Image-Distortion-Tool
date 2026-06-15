import { describe, expect, it } from 'vitest'
import { continueWithResult, swapWorkspaceImages, type WorkspaceImagePair } from './workspace-images'

function makeImage(name: string): WorkspaceImagePair['source'] {
  return {
    imageData: new ImageData(1, 1),
    url: `blob:${name}`,
    width: 1,
    height: 1,
    name,
  }
}

describe('workspace images', () => {
  it('swaps source and result images while preserving names', () => {
    const source = makeImage('original.png')
    const result = makeImage('scrambled.png')

    expect(swapWorkspaceImages({ source, result })).toEqual({
      source: result,
      result: source,
    })
  })

  it('does not swap when there is no result image', () => {
    const source = makeImage('original.png')

    expect(swapWorkspaceImages({ source, result: null })).toEqual({
      source,
      result: null,
    })
  })

  it('uses the latest result as the next source for repeated softening', () => {
    const source = makeImage('original.png')
    const result = makeImage('softened.png')

    expect(continueWithResult({ source, result })).toEqual({
      source: result,
      result,
    })
  })
})
