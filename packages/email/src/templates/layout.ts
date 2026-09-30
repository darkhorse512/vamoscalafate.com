import { SITE } from '@vamos/shared'

/**
 * Branded HTML email shell.
 *
 * Email clients are a hostile rendering target: no external stylesheets, no
 * flexbox or grid in Outlook, and images frequently blocked. So this uses
 * table layout, inline styles and a text-first hierarchy that still reads
 * correctly with images off.
 */

const COLORS = {
  ink: '#10221f',
  body: '#3d504c',
  muted: '#6b7f7a',
  glacier: '#1f6f8b',
  glacierDark: '#17566c',
  stone: '#f5f2ed',
  border: '#e2ddd4',
  white: '#ffffff',
  success: '#2f6f4f',
  warning: '#8a6014',
  danger: '#9b3232',
}

export type EmailButton = { label: string; url: string }

export type EmailSection =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'details'; rows: { label: string; value: string }[] }
  | { kind: 'callout'; tone: 'info' | 'success' | 'warning' | 'danger'; text: string }
  | { kind: 'button'; button: EmailButton }
  | { kind: 'divider' }

/** Escapes interpolated values so customer-supplied text cannot inject markup. */
export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const CALLOUT_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  info: { bg: '#eef5f8', border: COLORS.glacier, color: COLORS.glacierDark },
  success: { bg: '#edf5f0', border: COLORS.success, color: COLORS.success },
  warning: { bg: '#fbf4e6', border: '#c9942a', color: COLORS.warning },
  danger: { bg: '#fbeeee', border: COLORS.danger, color: COLORS.danger },
}

function renderSection(section: EmailSection): string {
  switch (section.kind) {
    case 'heading':
      return `<h2 style="margin:28px 0 10px;font-size:17px;line-height:1.35;font-weight:700;color:${COLORS.ink};">${esc(section.text)}</h2>`

    case 'paragraph':
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${COLORS.body};">${esc(section.text)}</p>`

    case 'divider':
      return `<hr style="border:none;border-top:1px solid ${COLORS.border};margin:24px 0;" />`

    case 'callout': {
      const s = CALLOUT_STYLES[section.tone] ?? CALLOUT_STYLES.info!
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr><td style="background:${s.bg};border-left:3px solid ${s.border};padding:14px 16px;border-radius:4px;font-size:14px;line-height:1.6;color:${s.color};">${esc(section.text)}</td></tr></table>`
    }

    case 'details': {
      const rows = section.rows
        .map(
          (row, i) => `<tr>
            <td style="padding:11px 0;font-size:14px;color:${COLORS.muted};width:44%;${i > 0 ? `border-top:1px solid ${COLORS.border};` : ''}">${esc(row.label)}</td>
            <td style="padding:11px 0;font-size:14px;color:${COLORS.ink};font-weight:600;text-align:right;${i > 0 ? `border-top:1px solid ${COLORS.border};` : ''}">${esc(row.value)}</td>
          </tr>`,
        )
        .join('')
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${COLORS.stone};border-radius:8px;padding:6px 18px;">${rows}</table>`
    }

    case 'button':
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 22px;"><tr><td style="background:${COLORS.glacier};border-radius:6px;">
        <a href="${esc(section.button.url)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:${COLORS.white};text-decoration:none;">${esc(section.button.label)}</a>
      </td></tr></table>`

    default:
      return ''
  }
}

export function renderEmail(options: {
  previewText: string
  title: string
  intro?: string
  sections: EmailSection[]
  footerNote?: string
}): string {
  const { previewText, title, intro, sections, footerNote } = options
  const year = new Date().getFullYear()

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.stone};-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(previewText)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.stone};padding:28px 14px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:${COLORS.white};border-radius:12px;overflow:hidden;border:1px solid ${COLORS.border};">

    <tr><td style="background:${COLORS.ink};padding:22px 32px;">
      <a href="${esc(SITE.url)}" style="font-size:19px;font-weight:700;color:${COLORS.white};text-decoration:none;letter-spacing:-0.01em;">Vamos Calafate</a>
      <div style="margin-top:3px;font-size:12px;color:#9fb3ae;letter-spacing:0.04em;text-transform:uppercase;">El Calafate · Patagonia Argentina</div>
    </td></tr>

    <tr><td style="padding:30px 32px 8px;">
      <h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;font-weight:700;color:${COLORS.ink};">${esc(title)}</h1>
      ${intro ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${COLORS.body};">${esc(intro)}</p>` : ''}
      ${sections.map(renderSection).join('\n')}
    </td></tr>

    <tr><td style="padding:10px 32px 30px;">
      ${footerNote ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:${COLORS.muted};">${esc(footerNote)}</p>` : ''}
      <hr style="border:none;border-top:1px solid ${COLORS.border};margin:0 0 16px;" />
      <p style="margin:0;font-size:12px;line-height:1.6;color:${COLORS.muted};">
        ${esc(SITE.name)} · El Calafate, Santa Cruz, Argentina<br />
        <a href="${esc(SITE.url)}" style="color:${COLORS.glacier};text-decoration:none;">vamoscalafate.com</a>
      </p>
      <p style="margin:12px 0 0;font-size:11px;color:#9aa8a4;">© ${year} ${esc(SITE.name)}. Este es un mensaje automático.</p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`
}

/**
 * Plain-text alternative.
 *
 * Not optional: a message with no text/plain part scores markedly worse with
 * spam filters and is unreadable in text-only clients.
 */
export function renderText(options: {
  title: string
  intro?: string
  sections: EmailSection[]
  footerNote?: string
}): string {
  const lines: string[] = [options.title, '='.repeat(Math.min(options.title.length, 60)), '']
  if (options.intro) lines.push(options.intro, '')

  for (const section of options.sections) {
    switch (section.kind) {
      case 'heading':
        lines.push('', section.text.toUpperCase(), '')
        break
      case 'paragraph':
        lines.push(section.text, '')
        break
      case 'callout':
        lines.push(`> ${section.text}`, '')
        break
      case 'details':
        for (const row of section.rows) lines.push(`${row.label}: ${row.value}`)
        lines.push('')
        break
      case 'button':
        lines.push(`${section.button.label}: ${section.button.url}`, '')
        break
      case 'divider':
        lines.push('-'.repeat(48), '')
        break
    }
  }

  if (options.footerNote) lines.push(options.footerNote, '')
  lines.push('-', `${SITE.name} · El Calafate, Santa Cruz, Argentina`, SITE.url)

  return lines.join('\n')
}
