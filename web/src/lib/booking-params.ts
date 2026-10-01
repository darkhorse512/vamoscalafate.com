/**
 * The booking selection travels from the tour page to the reservation page in
 * the URL, so the step is linkable and survives a refresh:
 *
 *   ?pax=<tierId>:2,<tierId>:1&extras=<extraId>:2
 *
 * The values are only a request. The reservation page re-reads every tier,
 * extra and price from the database, so an edited URL can change nothing but
 * what is asked for.
 */

const ID = /^[\w-]{1,80}$/

function encode(lines: { id: string; quantity: number }[]): string {
  return lines
    .filter((line) => line.quantity > 0)
    .map((line) => `${line.id}:${line.quantity}`)
    .join(',')
}

function decode(raw: string | undefined): { id: string; quantity: number }[] {
  if (!raw) return []
  const out: { id: string; quantity: number }[] = []
  for (const part of raw.split(',').slice(0, 20)) {
    const [id, qty] = part.split(':')
    const quantity = Number(qty)
    if (!id || !ID.test(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) continue
    out.push({ id, quantity })
  }
  return out
}

export function encodeTiers(lines: { tierId: string; quantity: number }[]): string {
  return encode(lines.map((line) => ({ id: line.tierId, quantity: line.quantity })))
}

export function encodeExtras(lines: { extraId: string; quantity: number }[]): string {
  return encode(lines.map((line) => ({ id: line.extraId, quantity: line.quantity })))
}

export function decodeTiers(raw: string | undefined): { tierId: string; quantity: number }[] {
  return decode(raw).map((line) => ({ tierId: line.id, quantity: line.quantity }))
}

export function decodeExtras(raw: string | undefined): { extraId: string; quantity: number }[] {
  return decode(raw).map((line) => ({ extraId: line.id, quantity: line.quantity }))
}
