/** Writes text to the clipboard. Resolves `false` when the Clipboard API is unavailable or denied. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!globalThis.navigator?.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
