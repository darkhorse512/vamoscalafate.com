/**
 * Renders editor text where *words between asterisks* are set in the brand
 * gradient. Lets the homepage editor emphasise a word in a heading without
 * writing markup. Anything else is plain text (React escapes it).
 */
export function Highlight({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean)
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
          <span key={index} className="text-gradient">
            {part.slice(1, -1)}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}

/** The same text with the asterisks removed, for attributes and metadata. */
export function plainText(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1')
}
