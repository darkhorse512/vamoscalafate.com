import { describe, expect, it } from 'vitest'
import {
  bookingSchema, contactSchema, hotelSubmissionSchema, loginSchema,
  matchesSignature, passwordSchema, slugSchema, tourSchema,
} from '@vamos/validation'

const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

/**
 * Server-side validation is the only validation that counts - the client can
 * send anything. These tests cover the cases an attacker or a buggy client
 * would actually produce.
 */
describe('validation', () => {
  describe('slug', () => {
    it('accepts kebab-case', () => {
      expect(slugSchema.safeParse('glaciar-perito-moreno').success).toBe(true)
    })

    it('rejects uppercase, spaces and path separators', () => {
      for (const bad of ['Glaciar Perito', 'GLACIAR', 'a/b', '../etc', 'a--']) {
        expect(slugSchema.safeParse(bad).success).toBe(false)
      }
    })
  })

  describe('password policy', () => {
    it('requires length, case and a digit', () => {
      expect(passwordSchema.safeParse('Abcdefghijk1').success).toBe(true)
      expect(passwordSchema.safeParse('short1A').success).toBe(false)
      expect(passwordSchema.safeParse('alllowercase1').success).toBe(false)
      expect(passwordSchema.safeParse('ALLUPPERCASE1').success).toBe(false)
      expect(passwordSchema.safeParse('NoDigitsAtAll').success).toBe(false)
    })
  })

  describe('login', () => {
    it('normalises the email to lowercase', () => {
      const result = loginSchema.safeParse({ email: '  ADMIN@Example.COM ', password: 'x' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.email).toBe('admin@example.com')
    })

    it('does NOT apply the password policy at login', () => {
      // An existing weak password must still be able to sign in and be changed.
      expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
    })
  })

  describe('booking', () => {
    const valid = {
      selection: {
        tourId: 'tour_1', optionId: 'opt_1', date: tomorrow,
        adults: 2, children: 0,
      },
      customer: {
        firstName: 'Ana', lastName: 'García', email: 'ana@example.com',
        phone: '+5492902123456', country: 'Argentina',
      },
      acceptedTerms: true,
    }

    it('accepts a well-formed booking', () => {
      expect(bookingSchema.safeParse(valid).success).toBe(true)
    })

    it('requires at least one adult', () => {
      const result = bookingSchema.safeParse({
        ...valid,
        selection: { ...valid.selection, adults: 0, children: 2 },
      })
      expect(result.success).toBe(false)
    })

    it('rejects a departure date in the past', () => {
      const result = bookingSchema.safeParse({
        ...valid,
        selection: { ...valid.selection, date: '2020-01-01' },
      })
      expect(result.success).toBe(false)
    })

    it('requires the terms to be accepted', () => {
      expect(bookingSchema.safeParse({ ...valid, acceptedTerms: false }).success).toBe(false)
    })

    it('rejects an invalid email', () => {
      const result = bookingSchema.safeParse({
        ...valid,
        customer: { ...valid.customer, email: 'not-an-email' },
      })
      expect(result.success).toBe(false)
    })

    it('rejects an implausibly large group', () => {
      const result = bookingSchema.safeParse({
        ...valid,
        selection: { ...valid.selection, adults: 40, children: 40 },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('tour', () => {
    const base = {
      name: 'Glaciar Perito Moreno',
      slug: 'glaciar-perito-moreno',
      summary: 'Excursión de día completo al glaciar con tiempo en las pasarelas.',
      description: 'x'.repeat(120),
      categoryId: 'cat_1',
      durationMinutes: 540,
      options: [
        {
          name: 'Regular', price: 85_000, durationMinutes: 540, capacity: 45,
          maxParticipants: 45, pickupIncluded: true,
        },
      ],
    }

    it('accepts a tour with one priced option', () => {
      expect(tourSchema.safeParse(base).success).toBe(true)
    })

    it('requires at least one option', () => {
      const result = tourSchema.safeParse({ ...base, options: [] })
      expect(result.success).toBe(false)
    })

    it('rejects a child price above the adult price', () => {
      const result = tourSchema.safeParse({
        ...base,
        options: [{ ...base.options[0], price: 100, childPrice: 200 }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects max participants below min participants', () => {
      const result = tourSchema.safeParse({
        ...base,
        options: [{ ...base.options[0], minParticipants: 10, maxParticipants: 4 }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects a negative price', () => {
      const result = tourSchema.safeParse({
        ...base,
        options: [{ ...base.options[0], price: -1 }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('contact form', () => {
    it('requires the privacy policy to be accepted', () => {
      const result = contactSchema.safeParse({
        name: 'Ana', email: 'a@b.com', subject: 'Consulta',
        message: 'Quisiera saber más sobre la excursión.',
        acceptedPrivacy: false,
      })
      expect(result.success).toBe(false)
    })

    it('strips control characters from free text', () => {
      const result = contactSchema.safeParse({
        name: 'Ana', email: 'a@b.com', subject: 'Consulta',
        message: 'Hola\u0000\u0007 mundo, quisiera consultar por una excursión.',
        acceptedPrivacy: true,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.message).not.toContain('\u0000')
        expect(result.data.message).not.toContain('\u0007')
      }
    })
  })

  describe('hotel submission', () => {
    it('rejects a javascript: URL in the image list', () => {
      const result = hotelSubmissionSchema.safeParse({
        businessName: 'Hotel Test',
        contactName: 'Ana García',
        email: 'a@b.com',
        phone: '+5492902123456',
        description: 'x'.repeat(60),
        // eslint-disable-next-line no-script-url
        imageUrls: ['javascript:alert(1)'],
        acceptedTerms: true,
      })
      expect(result.success).toBe(false)
    })

    it('accepts https image URLs', () => {
      const result = hotelSubmissionSchema.safeParse({
        businessName: 'Hotel Test',
        contactName: 'Ana García',
        email: 'a@b.com',
        phone: '+5492902123456',
        description: 'x'.repeat(60),
        imageUrls: ['https://example.com/photo.jpg'],
        acceptedTerms: true,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('file signature checking', () => {
    it('accepts a real JPEG header', () => {
      expect(matchesSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).toBe(true)
    })

    it('rejects a file whose bytes do not match the declared type', () => {
      // "GIF89a" declared as PNG - the classic renamed-upload case.
      const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
      expect(matchesSignature(gif, 'image/png')).toBe(false)
    })

    it('rejects a PHP script renamed to .jpg', () => {
      const php = new Uint8Array([0x3c, 0x3f, 0x70, 0x68, 0x70]) // "<?php"
      expect(matchesSignature(php, 'image/jpeg')).toBe(false)
    })

    it('requires the WEBP brand, not just the RIFF container', () => {
      const riffOnly = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20,
      ])
      expect(matchesSignature(riffOnly, 'image/webp')).toBe(false)

      const webp = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
      ])
      expect(matchesSignature(webp, 'image/webp')).toBe(true)
    })

    it('rejects an unknown mime type outright', () => {
      expect(matchesSignature(new Uint8Array([0, 1, 2, 3]), 'image/svg+xml')).toBe(false)
    })
  })
})
