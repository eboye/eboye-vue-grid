/**
 * Writes text to the clipboard. Uses the Clipboard API, and falls back to `execCommand('copy')`
 * where that API is missing or refused (pages served over plain http, browsers that deny it
 * without a permission). Resolves `false` when neither worked.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // missing or refused: copy through a hidden textarea, then give focus back
    const active = document.activeElement as HTMLElement | null
    const area = document.createElement('textarea')
    area.value = text
    area.style.cssText = 'position:fixed;top:0;opacity:0'
    document.body.append(area)
    area.focus({ preventScroll: true })
    area.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      // unsupported
    }
    area.remove()
    active?.focus({ preventScroll: true })
    return ok
  }
}
