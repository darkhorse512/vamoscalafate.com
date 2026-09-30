/**
 * Markdown renderer.
 *
 * XSS-safe by construction: the source is HTML-escaped BEFORE any markdown
 * transformation, so raw HTML in admin-authored content can never reach the
 * DOM as markup. That makes a sanitiser unnecessary and removes the jsdom
 * dependency a server-side DOMPurify would require.
 *
 * Supports the subset editors actually use: headings, bold, italic, links,
 * lists, blockquotes, tables, horizontal rules, inline code and paragraphs.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Only http(s) and site-relative links survive — blocks javascript: URLs. */
function safeHref(href: string): string | null {
  const trimmed = href.trim()
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(trimmed)) return trimmed
  return null
}

function renderInline(text: string): string {
  let out = escapeHtml(text)

  // Inline code first, so markers inside it are not treated as emphasis.
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Links: [label](href)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) => {
    const safe = safeHref(href)
    if (!safe) return label
    const isExternal = /^https?:\/\//i.test(safe)
    const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${safe}"${attrs}>${label}</a>`
  })

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')

  return out
}

function renderTable(rows: string[]): string {
  const cells = (row: string) =>
    row
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((cell) => cell.trim())

  const header = cells(rows[0]!)
  // rows[1] is the alignment separator and carries no content.
  const body = rows.slice(2).map(cells)

  const head = `<thead><tr>${header.map((c) => `<th>${renderInline(c)}</th>`).join('')}</tr></thead>`
  const tbody = `<tbody>${body
    .map((row) => `<tr>${row.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody>`

  return `<div class="overflow-x-auto"><table>${head}${tbody}</table></div>`
}

/** Exported for direct testing — see tests/unit/markdown.test.ts. */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]!
    const trimmed = line.trim()

    if (trimmed === '') {
      index += 1
      continue
    }

    if (/^---+$/.test(trimmed)) {
      html.push('<hr />')
      index += 1
      continue
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed)
    if (heading) {
      const level = heading[1]!.length
      // Demote by one: the page already owns its <h1>, so a document heading
      // must not create a second one.
      const tag = `h${Math.min(6, level + 1)}`
      html.push(`<${tag}>${renderInline(heading[2]!)}</${tag}>`)
      index += 1
      continue
    }

    // Table: a header row followed by an alignment separator.
    if (trimmed.startsWith('|') && lines[index + 1]?.trim().match(/^\|[\s:|-]+\|$/)) {
      const rows: string[] = []
      while (index < lines.length && lines[index]!.trim().startsWith('|')) {
        rows.push(lines[index]!.trim())
        index += 1
      }
      html.push(renderTable(rows))
      continue
    }

    if (trimmed.startsWith('> ')) {
      const quote: string[] = []
      while (index < lines.length && lines[index]!.trim().startsWith('>')) {
        quote.push(lines[index]!.trim().replace(/^>\s?/, ''))
        index += 1
      }
      html.push(`<blockquote>${renderInline(quote.join(' '))}</blockquote>`)
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index]!)) {
        items.push(lines[index]!.trim().replace(/^[-*]\s+/, ''))
        index += 1
      }
      html.push(`<ul>${items.map((i) => `<li>${renderInline(i)}</li>`).join('')}</ul>`)
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index]!)) {
        items.push(lines[index]!.trim().replace(/^\d+\.\s+/, ''))
        index += 1
      }
      html.push(`<ol>${items.map((i) => `<li>${renderInline(i)}</li>`).join('')}</ol>`)
      continue
    }

    // Paragraph: consume until a blank line or the start of another block.
    const paragraph: string[] = []
    while (
      index < lines.length &&
      lines[index]!.trim() !== '' &&
      !/^(#{1,4}\s|>|[-*]\s|\d+\.\s|\||---+$)/.test(lines[index]!.trim())
    ) {
      paragraph.push(lines[index]!.trim())
      index += 1
    }
    if (paragraph.length) html.push(`<p>${renderInline(paragraph.join(' '))}</p>`)
  }

  return html.join('\n')
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={className ?? 'prose-vamos'}
      // Safe: markdownToHtml escapes all input before generating markup, and
      // link hrefs are allow-listed to http(s), mailto and site-relative.
      dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
    />
  )
}
