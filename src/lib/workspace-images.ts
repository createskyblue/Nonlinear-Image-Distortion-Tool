import type { ImageLoadResult } from './image-io'

export type WorkspaceImagePair = {
  source: ImageLoadResult | null
  result: ImageLoadResult | null
}

export function swapWorkspaceImages(pair: WorkspaceImagePair): WorkspaceImagePair {
  if (!pair.result) {
    return pair
  }
  return {
    source: pair.result,
    result: pair.source,
  }
}

export function continueWithResult(pair: WorkspaceImagePair): WorkspaceImagePair {
  if (!pair.result) {
    return pair
  }
  return {
    source: pair.result,
    result: pair.result,
  }
}
