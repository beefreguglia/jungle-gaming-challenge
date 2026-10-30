const AVATAR_SIZE = 256

async function toDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:${blob.type};base64,${btoa(binary)}`
}

/**
 * Stores avatars as small WebP data URLs so they fit in localStorage and survive refresh.
 * Falls back to the original file where canvas APIs are missing (Node tests).
 */
export async function avatarDataUrl(file: Blob): Promise<string> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
    return toDataUrl(file)
  }
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, AVATAR_SIZE / Math.max(bitmap.width, bitmap.height))
    const canvas = new OffscreenCanvas(
      Math.round(bitmap.width * scale),
      Math.round(bitmap.height * scale),
    )
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return toDataUrl(await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 }))
  } catch {
    return toDataUrl(file)
  }
}
