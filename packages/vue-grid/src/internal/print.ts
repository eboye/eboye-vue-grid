import type { Align } from '../types'

/** A table to print: text cells, with the header repeated on every page. */
export interface PrintTable {
  title?: string
  header?: readonly string[]
  body: readonly (readonly string[])[]
  /** A last, bold line (the totals row). */
  footer?: readonly string[]
  align: readonly Align[]
  landscape?: boolean
}

const CSS = `
@page { margin: 12mm; }
@page landscape { size: landscape; }
html { font: 9.5pt/1.35 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #111; }
body { margin: 0; }
h1 { font-size: 12pt; margin: 0 0 6pt; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 0.5pt solid #bbb; padding: 2pt 4pt; text-align: start; vertical-align: top;
  overflow-wrap: anywhere; white-space: pre-line; }
thead th { background: #eef1f5; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.total td { font-weight: 700; border-top: 1pt solid #666; }
tr { break-inside: avoid; }
.end { text-align: end; font-variant-numeric: tabular-nums; }
.center { text-align: center; }
`

/**
 * Prints a table from a hidden frame: the browser's print dialog, with a real `<table>` (so the
 * header repeats on each page), built with DOM calls only. Resolves when printing is over.
 */
export function printTable(t: PrintTable): Promise<void> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.title = t.title ?? 'Print'
    // Off-screen but laid out: some browsers print an invisible frame blank.
    Object.assign(frame.style, {
      position: 'fixed',
      insetInlineStart: '-10000px',
      insetBlockStart: '0',
      width: '1000px',
      height: '1000px',
      border: '0',
    })
    document.body.appendChild(frame)
    const win = frame.contentWindow!
    const doc = frame.contentDocument!
    const el = <K extends keyof HTMLElementTagNameMap>(
      tag: K,
      text?: string,
      className?: string,
    ) => {
      const node = doc.createElement(tag)
      if (text !== undefined) node.textContent = text
      if (className) node.className = className
      return node
    }
    const cls = (i: number) => (t.align[i] === 'start' ? undefined : t.align[i])

    doc.title = t.title ?? ''
    doc.documentElement.lang = document.documentElement.lang || 'en'
    const style = el('style', CSS + (t.landscape ? 'body { page: landscape; }' : ''))
    doc.head.append(style)
    if (t.title) doc.body.append(el('h1', t.title))
    const table = el('table')
    if (t.header) {
      const row = el('tr')
      t.header.forEach((h, i) => {
        const th = el('th', h, cls(i))
        th.scope = 'col'
        row.append(th)
      })
      const thead = el('thead')
      thead.append(row)
      table.append(thead)
    }
    const body = el('tbody')
    for (const line of t.body) {
      const row = el('tr')
      line.forEach((text, i) => row.append(el('td', text, cls(i))))
      body.append(row)
    }
    table.append(body)
    if (t.footer) {
      const row = el('tr')
      t.footer.forEach((text, i) => row.append(el('td', text, cls(i))))
      // A last body row, not a <tfoot>: browsers repeat a table footer on every printed page.
      row.className = 'total'
      body.append(row)
    }
    doc.body.append(table)

    let done = false
    const finish = () => {
      if (done) return
      done = true
      window.removeEventListener('focus', finish)
      frame.remove()
      resolve()
    }
    // After layout. `print()` blocks until the dialog closes in most browsers; where it doesn't,
    // `afterprint` (or the page getting focus back) ends it.
    setTimeout(() => {
      win.addEventListener('afterprint', finish, { once: true })
      win.focus()
      const started = Date.now()
      win.print()
      // It blocked while the dialog was open: printing is over.
      if (Date.now() - started > 250) finish()
      else if (!done) window.addEventListener('focus', finish, { once: true })
    }, 0)
  })
}
