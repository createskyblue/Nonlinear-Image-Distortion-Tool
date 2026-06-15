export function getFirstImageFileFromFileList(files: FileList | File[]): File | null {
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) {
      return file
    }
  }
  return null
}

export function getFirstImageFileFromItems(items: DataTransferItemList): File | null {
  for (const item of Array.from(items)) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (file) return file
  }
  return null
}

export function hasFileTransfer(transfer: DataTransfer): boolean {
  if (Array.from(transfer.types).includes('Files')) return true
  if (getFirstImageFileFromItems(transfer.items)) return true
  return getFirstImageFileFromFileList(Array.from(transfer.files)) !== null
}
