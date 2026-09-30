/**
 * Form-shape definitions for the blog editor.
 *
 * Kept out of the `'use client'` component for the same reason as the tour
 * editor's mapping: Server Components import these while rendering, and every
 * export of a client module becomes a client reference.
 */

export type BlogFormData = {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: string
  status: string
  categoryId: string
  destinationId: string
  tagIds: string[]
  featured: boolean
  publishedAt: string
  seo: {
    title: string
    description: string
    canonicalUrl: string
    ogTitle: string
    ogDescription: string
    ogImageUrl: string
    noindex: boolean
    nofollow: boolean
  }
}

export const EMPTY_POST: BlogFormData = {
  title: '', slug: '', excerpt: '', content: '', status: 'DRAFT',
  categoryId: '', destinationId: '', tagIds: [], featured: false, publishedAt: '',
  seo: {
    title: '', description: '', canonicalUrl: '', ogTitle: '',
    ogDescription: '', ogImageUrl: '', noindex: false, nofollow: false,
  },
}

