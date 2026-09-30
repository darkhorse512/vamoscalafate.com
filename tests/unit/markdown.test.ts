import { describe, expect, it } from 'vitest'
import { markdownToHtml } from '../../web/src/components/content/Markdown'

/**
 * The Markdown renderer output goes through `dangerouslySetInnerHTML`, so its
 * XSS safety is not optional. The design escapes the source BEFORE applying
 * any Markdown transformation, which means raw HTML can never survive into
 * the DOM as markup. These tests pin that property down.
 *
 * Content here is admin-authored, but "trusted author" is not a security
 * model: a compromised editor account, or content pasted from elsewhere,
 * must not be able to execute script.
 */
describe('markdown renderer — XSS safety', () => {
  it('escapes a raw script tag', () => {
    const html = markdownToHtml('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes an img onerror handler into inert text', () => {
    const html = markdownToHtml('<img src=x onerror=alert(1)>')
    // The attribute text survives, but only as escaped character data — there
    // is no element for the handler to attach to, so it can never fire.
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
    expect(html).toContain('&gt;')
  })

  it('strips a javascript: URL from a markdown link, keeping the text', () => {
    // eslint-disable-next-line no-script-url
    const html = markdownToHtml('[haceme clic](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('<a href')
    expect(html).toContain('haceme clic')
  })

  it('strips a data: URL from a markdown link', () => {
    const html = markdownToHtml('[x](data:text/html;base64,PHNjcmlwdD4=)')
    expect(html).not.toContain('data:text/html')
  })

  it('escapes an iframe', () => {
    const html = markdownToHtml('<iframe src="https://evil.example"></iframe>')
    expect(html).not.toContain('<iframe')
  })

  it('does not let a link label break out of the anchor', () => {
    const html = markdownToHtml('[<script>alert(1)</script>](https://example.com)')
    expect(html).not.toContain('<script>')
  })
})

describe('markdown renderer — output', () => {
  it('renders headings demoted by one level', () => {
    // The page owns its <h1>; document headings must not create a second one.
    expect(markdownToHtml('# Título')).toContain('<h2>')
    expect(markdownToHtml('## Subtítulo')).toContain('<h3>')
  })

  it('renders bold and italic', () => {
    expect(markdownToHtml('Texto **fuerte**')).toContain('<strong>fuerte</strong>')
    expect(markdownToHtml('Texto *enfático*')).toContain('<em>enfático</em>')
  })

  it('renders unordered and ordered lists', () => {
    const ul = markdownToHtml('- uno\n- dos')
    expect(ul).toContain('<ul>')
    expect(ul).toContain('<li>uno</li>')

    const ol = markdownToHtml('1. uno\n2. dos')
    expect(ol).toContain('<ol>')
  })

  it('renders a table inside a horizontally scrollable wrapper', () => {
    const html = markdownToHtml('| A | B |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table>')
    expect(html).toContain('<th>A</th>')
    expect(html).toContain('<td>1</td>')
    // Wide tables must not force the whole page to scroll sideways on mobile.
    expect(html).toContain('overflow-x-auto')
  })

  it('marks external links with noopener noreferrer', () => {
    const html = markdownToHtml('[sitio](https://example.com)')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('target="_blank"')
  })

  it('leaves internal links without a target', () => {
    const html = markdownToHtml('[excursiones](/excursiones)')
    expect(html).toContain('href="/excursiones"')
    expect(html).not.toContain('target="_blank"')
  })

  it('renders blockquotes', () => {
    expect(markdownToHtml('> Una cita')).toContain('<blockquote>')
  })

  it('handles an empty document without throwing', () => {
    expect(markdownToHtml('')).toBe('')
    expect(markdownToHtml('\n\n\n')).toBe('')
  })

  it('preserves Spanish accents and ñ', () => {
    const html = markdownToHtml('El Cañón del Río Pinturas está en Santa Cruz.')
    expect(html).toContain('Cañón')
    expect(html).toContain('está')
  })
})
