/** Unified site-search result, normalised across every content type. */
export type SearchResultType = 'tour' | 'hotel' | 'business' | 'blog' | 'destination'

export type SearchResult = {
  type: SearchResultType
  id: string
  title: string
  excerpt: string
  url: string
  imageUrl: string | null
  imageAlt: string | null
  /** Minor units. Only present for sellable products. */
  priceCents?: number | null
  currency?: string | null
}

export type SearchResponse = {
  query: string
  total: number
  groups: { type: SearchResultType; label: string; results: SearchResult[] }[]
}
