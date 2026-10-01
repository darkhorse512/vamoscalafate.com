'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  ArrowDown, ArrowUp, ChevronDown, Copy, Eye, EyeOff, ExternalLink, Plus, RotateCcw, Save, Trash2,
} from 'lucide-react'
import {
  DEFAULT_HOME_CONFIG, type HeroSlideConfig, type HomeConfig, type HomeSectionId,
} from '@vamos/validation'
import { saveHomeConfigAction } from '@/server/actions/homepage'
import { SingleImageField } from './ImageField'
import { ConfirmDialog } from './ConfirmDialog'
import { Alert, Button } from './ui/primitives'
import { cn } from '@/lib/utils'

type Option = { slug: string; name: string }
type Sections = HomeConfig['sections']

const SECTION_META: Record<HomeSectionId, { title: string; description: string }> = {
  search: { title: 'Buscador', description: 'Caja de búsqueda superpuesta al pie del hero.' },
  catalogue: { title: 'Excursiones', description: 'Grilla de excursiones con el banner «3 imperdibles» y la tarjeta de cierre.' },
  categories: { title: 'Tipos de experiencia', description: 'Mosaico de fotos por categoría (las categorías se editan en Catálogo → Categorías).' },
  spotlight: { title: 'Excursión destacada', description: 'Banner oscuro a todo el ancho con fotos, datos y precio de una excursión.' },
  destinations: { title: 'Destinos', description: 'Carrusel de destinos (se editan en Catálogo → Destinos).' },
  facts: { title: 'Datos del parque', description: 'Foto a todo el ancho con cifras destacadas.' },
  seasons: { title: 'Cuándo viajar', description: 'Pestañas por estación con clima, luz diurna y recomendaciones.' },
  gallery: { title: 'Galería', description: 'Dos filas de fotos en movimiento, tomadas de las excursiones publicadas.' },
  reviews: { title: 'Opiniones', description: 'Solo aparece cuando hay reseñas aprobadas (Guía local → Reseñas).' },
  why: { title: 'Por qué reservar acá', description: 'Tarjetas con ícono, título y texto.' },
  guide: { title: 'Guía de viaje', description: 'Carrusel con los últimos artículos del blog.' },
  hotels: { title: 'Dónde dormir', description: 'Solo aparece cuando hay alojamientos publicados.' },
  cta: { title: 'Llamado final', description: 'Banda final con foto, título y dos botones.' },
}

const WHY_ICON_LABELS = {
  compass: 'Brújula',
  clock: 'Reloj',
  shield: 'Escudo',
  messages: 'Mensajes',
  star: 'Estrella',
  heart: 'Corazón',
  map: 'Mapa',
  users: 'Personas',
} as const

/**
 * Homepage editor.
 *
 * Edits a single configuration document. Changes are local until "Guardar",
 * so an editor can reorder and rewrite freely; a dirty marker and a leave-
 * page warning protect unsaved work. The same schema validates on the
 * server, and its error paths are mapped back to the fields here.
 */
export function HomeEditor({
  initial,
  tours,
  destinations,
  canEdit,
  siteUrl,
  lastSaved,
}: {
  initial: HomeConfig
  tours: Option[]
  destinations: Option[]
  canEdit: boolean
  siteUrl: string
  lastSaved: string | null
}) {
  const [config, setConfig] = useState<HomeConfig>(initial)
  const [saved, setSaved] = useState<string>(JSON.stringify(initial))
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const [open, setOpen] = useState<string | null>('hero')
  const [confirmReset, setConfirmReset] = useState(false)
  const [pending, startTransition] = useTransition()

  const dirty = useMemo(() => JSON.stringify(config) !== saved, [config, saved])

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const setSection = <K extends HomeSectionId>(id: K, patch: Partial<Sections[K]>) =>
    setConfig((current) => ({
      ...current,
      sections: { ...current.sections, [id]: { ...current.sections[id], ...patch } },
    }))

  const setSlides = (slides: HeroSlideConfig[]) => setConfig((c) => ({ ...c, hero: { ...c.hero, slides } }))

  function moveSection(index: number, delta: -1 | 1) {
    setConfig((current) => {
      const order = [...current.order]
      const target = index + delta
      if (target < 0 || target >= order.length) return current
      ;[order[index], order[target]] = [order[target]!, order[index]!]
      return { ...current, order }
    })
  }

  function save() {
    setMessage(null)
    setErrors({})
    startTransition(async () => {
      const result = await saveHomeConfigAction(config)
      if (result.ok) {
        setSaved(JSON.stringify(config))
        setMessage({ tone: 'success', text: 'Cambios guardados y publicados en la página de inicio.' })
      } else {
        setErrors(result.fieldErrors ?? {})
        setMessage({ tone: 'danger', text: result.message })
        // Open the first section with an error so it is visible.
        const first = Object.keys(result.fieldErrors ?? {})[0]
        if (first) setOpen(first.startsWith('hero') ? 'hero' : (first.split('.')[1] ?? null))
      }
    })
  }

  const err = (path: string) => errors[path]?.[0]
  const disabled = !canEdit

  return (
    <div className="pb-24">
      {!canEdit ? (
        <div className="mb-5">
          <Alert tone="warning">Tu rol puede ver esta configuración pero no modificarla.</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mb-5">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      ) : null}

      <p className="mb-5 rounded-panel border border-border bg-surface-muted px-4 py-3 text-[0.8125rem] text-muted-foreground">
        Consejo: en los títulos podés escribir una palabra entre <code className="font-mono text-heading">*asteriscos*</code>{' '}
        para resaltarla con el degradé de la marca. Las imágenes vacías usan la foto automática indicada.
      </p>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <Card
        id="hero"
        title="Hero (carrusel principal)"
        description="Diapositivas a pantalla completa al comienzo de la página."
        open={open === 'hero'}
        onToggle={() => setOpen(open === 'hero' ? null : 'hero')}
        badge={`${config.hero.slides.filter((s) => s.enabled).length} activas`}
      >
        <div className="grid gap-4 sm:max-w-xs">
          <NumberField
            label="Segundos por diapositiva"
            value={config.hero.autoplaySeconds}
            min={3}
            max={30}
            disabled={disabled}
            onChange={(autoplaySeconds) => setConfig((c) => ({ ...c, hero: { ...c.hero, autoplaySeconds } }))}
            error={err('hero.autoplaySeconds')}
          />
        </div>

        <ol className="mt-5 space-y-3">
          {config.hero.slides.map((slide, index) => {
            const update = (patch: Partial<HeroSlideConfig>) =>
              setSlides(config.hero.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)))
            const base = `hero.slides.${index}`
            return (
              <li key={index} className={cn('rounded-panel border border-border p-4', !slide.enabled && 'opacity-60')}>
                <ItemHeader
                  label={`Diapositiva ${index + 1}${slide.tabLabel ? ` · ${slide.tabLabel}` : ''}`}
                  enabled={slide.enabled}
                  disabled={disabled}
                  onToggle={() => update({ enabled: !slide.enabled })}
                  onUp={index > 0 ? () => setSlides(swap(config.hero.slides, index, -1)) : undefined}
                  onDown={index < config.hero.slides.length - 1 ? () => setSlides(swap(config.hero.slides, index, 1)) : undefined}
                  onDuplicate={config.hero.slides.length < 8 ? () => setSlides(insertAt(config.hero.slides, index + 1, { ...slide })) : undefined}
                  onRemove={config.hero.slides.length > 1 ? () => setSlides(config.hero.slides.filter((_, i) => i !== index)) : undefined}
                />
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Etiqueta de la pestaña" value={slide.tabLabel} max={40} disabled={disabled} onChange={(tabLabel) => update({ tabLabel })} error={err(`${base}.tabLabel`)} />
                    <TextField label="Antetítulo" value={slide.eyebrow} max={80} disabled={disabled} onChange={(eyebrow) => update({ eyebrow })} error={err(`${base}.eyebrow`)} />
                    <TextField className="sm:col-span-2" label="Título" value={slide.title} max={120} disabled={disabled} onChange={(title) => update({ title })} error={err(`${base}.title`)} />
                    <TextArea className="sm:col-span-2" label="Texto" value={slide.description} max={300} disabled={disabled} onChange={(description) => update({ description })} error={err(`${base}.description`)} />
                    <ButtonFields label="Botón principal" value={slide.primary} disabled={disabled} onChange={(primary) => update({ primary })} error={err(`${base}.primary.href`)} />
                    <ButtonFields label="Botón secundario (opcional)" value={slide.secondary} disabled={disabled} onChange={(secondary) => update({ secondary })} error={err(`${base}.secondary.href`)} />
                  </div>
                  <div className="space-y-3">
                    <SingleImageField label="Imagen" hint="Vacío = usar la foto automática" value={slide.imageId} onChange={(imageId) => update({ imageId })} />
                    <SelectField
                      label="Foto automática"
                      value={`${slide.imageFrom.kind}:${slide.imageFrom.slug}`}
                      disabled={disabled}
                      onChange={(value) => {
                        const [kind, slug] = value.split(':') as ['tour' | 'destination', string]
                        update({ imageFrom: { kind, slug } })
                      }}
                      options={[
                        ...tours.map((t) => ({ value: `tour:${t.slug}`, label: `Excursión · ${t.name}` })),
                        ...destinations.map((d) => ({ value: `destination:${d.slug}`, label: `Destino · ${d.name}` })),
                      ]}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
        {config.hero.slides.length < 8 && !disabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setSlides([...config.hero.slides, { ...DEFAULT_HOME_CONFIG.hero.slides[0]!, title: 'Nueva diapositiva', tabLabel: 'Nueva' }])}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Agregar diapositiva
          </Button>
        ) : null}
      </Card>

      {/* ── Sections, in page order ──────────────────────────────────── */}
      <h2 className="mb-3 mt-8 text-[0.8125rem] font-semibold uppercase tracking-wide text-subtle-foreground">
        Secciones, en el orden en que aparecen
      </h2>
      <ol className="space-y-3">
        {config.order.map((id, index) => {
          const section = config.sections[id]
          const meta = SECTION_META[id]
          return (
            <li key={id}>
              <Card
                id={id}
                title={`${index + 1}. ${meta.title}`}
                description={meta.description}
                open={open === id}
                onToggle={() => setOpen(open === id ? null : id)}
                muted={!section.enabled}
                badge={section.enabled ? 'Visible' : 'Oculta'}
                actions={
                  <>
                    <IconButton label="Subir" disabled={disabled || index === 0} onClick={() => moveSection(index, -1)}>
                      <ArrowUp className="size-3.5" />
                    </IconButton>
                    <IconButton label="Bajar" disabled={disabled || index === config.order.length - 1} onClick={() => moveSection(index, 1)}>
                      <ArrowDown className="size-3.5" />
                    </IconButton>
                    <IconButton
                      label={section.enabled ? 'Ocultar sección' : 'Mostrar sección'}
                      disabled={disabled}
                      onClick={() => setSection(id, { enabled: !section.enabled } as Partial<Sections[typeof id]>)}
                    >
                      {section.enabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </IconButton>
                  </>
                }
              >
                <SectionFields
                  id={id}
                  sections={config.sections}
                  setSection={setSection}
                  tours={tours}
                  destinations={destinations}
                  disabled={disabled}
                  err={err}
                />
              </Card>
            </li>
          )
        })}
      </ol>

      {/* ── Save bar ─────────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:left-(--sidebar-width)">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-[0.8125rem] text-muted-foreground">
            {dirty ? (
              <span className="font-semibold text-status-warning">Hay cambios sin guardar</span>
            ) : lastSaved ? (
              <>Última publicación: {new Date(lastSaved).toLocaleString('es-AR')}</>
            ) : (
              'Usando la configuración original'
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={siteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border-strong px-3 text-[0.8125rem] font-medium text-foreground hover:bg-surface-muted"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Ver la página
            </a>
            {canEdit ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Valores originales
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={!dirty || pending} onClick={() => setConfig(JSON.parse(saved) as HomeConfig)}>
                  Descartar
                </Button>
                <Button type="button" size="sm" disabled={!dirty || pending} onClick={save}>
                  <Save className="size-3.5" aria-hidden="true" />
                  {pending ? 'Guardando…' : 'Guardar y publicar'}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {confirmReset ? (
        <ConfirmDialog
          title="¿Volver a la configuración original?"
          description="Se cargan en el editor los textos, el orden y las imágenes originales. No se publica nada hasta que guardes."
          confirmLabel="Cargar valores originales"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfig(DEFAULT_HOME_CONFIG)
            setConfirmReset(false)
          }}
        />
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-section fields
// ─────────────────────────────────────────────────────────────────────────────

function SectionFields({
  id,
  sections: s,
  setSection,
  tours,
  destinations,
  disabled,
  err,
}: {
  id: HomeSectionId
  sections: Sections
  setSection: <K extends HomeSectionId>(id: K, patch: Partial<Sections[K]>) => void
  tours: Option[]
  destinations: Option[]
  disabled: boolean
  err: (path: string) => string | undefined
}) {
  const tourOptions = tours.map((t) => ({ value: t.slug, label: t.name }))
  const heading = (key: 'catalogue' | 'categories' | 'destinations' | 'seasons' | 'gallery' | 'reviews' | 'why' | 'guide' | 'hotels') => (
    <HeadingFields
      value={s[key].heading}
      disabled={disabled}
      onChange={(headingValue) => setSection(key, { heading: headingValue } as Partial<Sections[typeof key]>)}
      errorPrefix={`sections.${key}.heading`}
      err={err}
    />
  )

  switch (id) {
    case 'search':
      return <Note>No tiene textos propios: muestra el buscador de excursiones con las categorías publicadas.</Note>

    case 'catalogue': {
      const c = s.catalogue
      const custom = c.tourSlugs.length > 0
      return (
        <div className="space-y-6">
          {heading('catalogue')}

          <Group title="Qué excursiones mostrar">
            <label className="flex items-center gap-2 text-[0.8125rem] text-foreground">
              <input
                type="checkbox"
                checked={!custom}
                disabled={disabled}
                onChange={(event) => setSection('catalogue', { tourSlugs: event.target.checked ? [] : tours.map((t) => t.slug) })}
              />
              Todas las publicadas, en el orden del catálogo
            </label>
            {custom ? (
              <OrderedPicker
                values={c.tourSlugs}
                options={tourOptions}
                disabled={disabled}
                onChange={(tourSlugs) => setSection('catalogue', { tourSlugs })}
              />
            ) : null}
          </Group>

          <Group title="Banner «3 imperdibles»">
            <Toggle label="Mostrar el banner" checked={c.banner.enabled} disabled={disabled} onChange={(enabled) => setSection('catalogue', { banner: { ...c.banner, enabled } })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField label="Excursiones antes del banner" value={c.tilesBeforeBanner} min={0} max={12} disabled={disabled} onChange={(tilesBeforeBanner) => setSection('catalogue', { tilesBeforeBanner })} />
              <TextField label="Etiqueta" value={c.banner.badge} max={40} disabled={disabled} onChange={(badge) => setSection('catalogue', { banner: { ...c.banner, badge } })} />
              <TextField label="Título (cara 1)" value={c.banner.headlineFront} max={80} disabled={disabled} onChange={(headlineFront) => setSection('catalogue', { banner: { ...c.banner, headlineFront } })} />
              <TextField label="Título (cara 2, al girar)" value={c.banner.headlineBack} max={80} disabled={disabled} onChange={(headlineBack) => setSection('catalogue', { banner: { ...c.banner, headlineBack } })} />
              <TextArea className="sm:col-span-2" label="Texto" value={c.banner.body} max={400} disabled={disabled} onChange={(body) => setSection('catalogue', { banner: { ...c.banner, body } })} />
              <ButtonFields label="Botón" value={c.banner.cta} disabled={disabled} onChange={(cta) => setSection('catalogue', { banner: { ...c.banner, cta } })} error={err('sections.catalogue.banner.cta.href')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {c.banner.tourSlugs.map((slug, i) => (
                <SelectField
                  key={i}
                  label={`Excursión ${i + 1}`}
                  value={slug}
                  disabled={disabled}
                  options={tourOptions}
                  onChange={(value) =>
                    setSection('catalogue', {
                      banner: { ...c.banner, tourSlugs: c.banner.tourSlugs.map((x, j) => (j === i ? value : x)) },
                    })
                  }
                />
              ))}
            </div>
          </Group>

          <Group title="Tarjeta de cierre (completa la última fila de la grilla)">
            <Toggle label="Mostrar la tarjeta" checked={c.closingCard.enabled} disabled={disabled} onChange={(enabled) => setSection('catalogue', { closingCard: { ...c.closingCard, enabled } })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Antetítulo" value={c.closingCard.eyebrow} max={60} disabled={disabled} onChange={(eyebrow) => setSection('catalogue', { closingCard: { ...c.closingCard, eyebrow } })} />
              <TextField label="Título" value={c.closingCard.title} max={120} disabled={disabled} onChange={(title) => setSection('catalogue', { closingCard: { ...c.closingCard, title } })} />
              <TextArea className="sm:col-span-2" label="Texto" value={c.closingCard.body} max={300} disabled={disabled} onChange={(body) => setSection('catalogue', { closingCard: { ...c.closingCard, body } })} />
              <ButtonFields label="Botón principal" value={c.closingCard.primary} disabled={disabled} onChange={(primary) => setSection('catalogue', { closingCard: { ...c.closingCard, primary } })} />
              <ButtonFields label="Botón secundario" value={c.closingCard.secondary} disabled={disabled} onChange={(secondary) => setSection('catalogue', { closingCard: { ...c.closingCard, secondary } })} />
            </div>
          </Group>
        </div>
      )
    }

    case 'categories':
    case 'destinations':
    case 'reviews':
    case 'hotels':
      return heading(id)

    case 'spotlight':
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Excursión" value={s.spotlight.tourSlug} disabled={disabled} options={tourOptions} onChange={(tourSlug) => setSection('spotlight', { tourSlug })} />
          <TextField label="Antetítulo" value={s.spotlight.eyebrow} max={80} disabled={disabled} onChange={(eyebrow) => setSection('spotlight', { eyebrow })} />
          <TextField label="Texto del botón" value={s.spotlight.ctaLabel} max={60} disabled={disabled} onChange={(ctaLabel) => setSection('spotlight', { ctaLabel })} />
          <Note className="sm:col-span-3">Las fotos, los puntos destacados, la duración y el precio se toman de la excursión elegida.</Note>
        </div>
      )

    case 'facts': {
      const f = s.facts
      return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Antetítulo" value={f.eyebrow} max={80} disabled={disabled} onChange={(eyebrow) => setSection('facts', { eyebrow })} />
              <TextField label="Título" value={f.title} max={160} disabled={disabled} onChange={(title) => setSection('facts', { title })} />
            </div>
            <ItemList
              title="Cifras"
              items={f.items}
              max={6}
              min={1}
              disabled={disabled}
              onChange={(items) => setSection('facts', { items })}
              blank={{ value: '', label: '' }}
              render={(item, update) => (
                <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <TextField label="Cifra" value={item.value} max={20} disabled={disabled} onChange={(value) => update({ value })} />
                  <TextField label="Descripción" value={item.label} max={120} disabled={disabled} onChange={(label) => update({ label })} />
                </div>
              )}
            />
            <Note>Usá datos del lugar, no de la empresa: nada de cantidades de clientes ni calificaciones inventadas.</Note>
          </div>
          <SingleImageField label="Foto de fondo" hint="Vacío = foto del Glaciar Perito Moreno" value={f.imageId} onChange={(imageId) => setSection('facts', { imageId })} />
        </div>
      )
    }

    case 'seasons':
      return (
        <div className="space-y-5">
          {heading('seasons')}
          {s.seasons.items.map((season, i) => {
            const update = (patch: Partial<typeof season>) =>
              setSection('seasons', { items: s.seasons.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
            return (
              <Group key={season.id} title={season.name || season.id}>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Nombre" value={season.name} max={30} disabled={disabled} onChange={(name) => update({ name })} />
                    <TextField label="Meses" value={season.months} max={30} disabled={disabled} onChange={(months) => update({ months })} />
                    <TextField label="Luz diurna" value={season.daylight} max={30} disabled={disabled} onChange={(daylight) => update({ daylight })} />
                    <TextField label="Temperatura" value={season.temperature} max={30} disabled={disabled} onChange={(temperature) => update({ temperature })} />
                    <TextArea className="sm:col-span-2" label="Descripción" value={season.description} max={600} disabled={disabled} onChange={(description) => update({ description })} />
                    <TextField
                      className="sm:col-span-2"
                      label="Ideal para (separado por comas, hasta 6)"
                      value={season.goodFor.join(', ')}
                      max={260}
                      disabled={disabled}
                      onChange={(value) => update({ goodFor: value.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 6) })}
                    />
                  </div>
                  <div className="space-y-3">
                    <SingleImageField label="Foto" hint="Vacío = foto del destino elegido" value={season.imageId} onChange={(imageId) => update({ imageId })} />
                    <SelectField
                      label="Foto automática (destino)"
                      value={season.imageFrom}
                      disabled={disabled}
                      options={destinations.map((d) => ({ value: d.slug, label: d.name }))}
                      onChange={(imageFrom) => update({ imageFrom })}
                    />
                  </div>
                </div>
              </Group>
            )
          })}
        </div>
      )

    case 'gallery':
      return (
        <div className="space-y-4">
          {heading('gallery')}
          <div className="sm:max-w-xs">
            <NumberField label="Cantidad máxima de fotos" value={s.gallery.maxPhotos} min={4} max={30} disabled={disabled} onChange={(maxPhotos) => setSection('gallery', { maxPhotos })} />
          </div>
        </div>
      )

    case 'why':
      return (
        <div className="space-y-4">
          {heading('why')}
          <ItemList
            title="Tarjetas"
            items={s.why.items}
            max={8}
            min={1}
            disabled={disabled}
            onChange={(items) => setSection('why', { items })}
            blank={{ icon: 'star' as const, title: '', description: '' }}
            render={(item, update) => (
              <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <SelectField
                  label="Ícono"
                  value={item.icon}
                  disabled={disabled}
                  options={Object.entries(WHY_ICON_LABELS).map(([value, label]) => ({ value, label }))}
                  onChange={(icon) => update({ icon: icon as typeof item.icon })}
                />
                <TextField label="Título" value={item.title} max={60} disabled={disabled} onChange={(title) => update({ title })} />
                <TextArea className="sm:col-span-2" label="Texto" value={item.description} max={240} disabled={disabled} onChange={(description) => update({ description })} />
              </div>
            )}
          />
        </div>
      )

    case 'guide':
      return (
        <div className="space-y-4">
          {heading('guide')}
          <div className="sm:max-w-xs">
            <NumberField label="Cantidad de artículos" value={s.guide.count} min={1} max={12} disabled={disabled} onChange={(count) => setSection('guide', { count })} />
          </div>
        </div>
      )

    case 'cta': {
      const c = s.cta
      return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Antetítulo" value={c.eyebrow} max={80} disabled={disabled} onChange={(eyebrow) => setSection('cta', { eyebrow })} />
            <TextField label="Título" value={c.title} max={160} disabled={disabled} onChange={(title) => setSection('cta', { title })} />
            <TextArea className="sm:col-span-2" label="Texto" value={c.description} max={400} disabled={disabled} onChange={(description) => setSection('cta', { description })} />
            <ButtonFields label="Botón principal" value={c.primary} disabled={disabled} onChange={(primary) => setSection('cta', { primary })} error={err('sections.cta.primary.href')} />
            <ButtonFields label="Botón secundario" value={c.secondary} disabled={disabled} onChange={(secondary) => setSection('cta', { secondary })} error={err('sections.cta.secondary.href')} />
          </div>
          <SingleImageField label="Foto de fondo" hint="Vacío = foto del Lago Argentino" value={c.imageId} onChange={(imageId) => setSection('cta', { imageId })} />
        </div>
      )
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────────────────────────────────────

function swap<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const next = [...list]
  const target = index + delta
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

function insertAt<T>(list: T[], index: number, item: T): T[] {
  return [...list.slice(0, index), item, ...list.slice(index)]
}

function Card({
  id,
  title,
  description,
  open,
  onToggle,
  badge,
  muted = false,
  actions,
  children,
}: {
  id: string
  title: string
  description: string
  open: boolean
  onToggle: () => void
  badge?: string
  muted?: boolean
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={`home-${id}`} className={cn('admin-panel', muted && 'opacity-70')}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <ChevronDown
            className={cn('mt-0.5 size-4 shrink-0 text-subtle-foreground transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[0.9375rem] font-semibold text-heading">{title}</span>
              {badge ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold',
                    muted ? 'bg-surface-strong text-subtle-foreground' : 'bg-primary-soft text-primary',
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 block text-[0.8125rem] text-subtle-foreground">{description}</span>
          </span>
        </button>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
      {open ? <div className="border-t border-border px-4 py-5">{children}</div> : null}
    </section>
  )
}

function ItemHeader({
  label,
  enabled,
  disabled,
  onToggle,
  onUp,
  onDown,
  onDuplicate,
  onRemove,
}: {
  label: string
  enabled: boolean
  disabled: boolean
  onToggle: () => void
  onUp?: () => void
  onDown?: () => void
  onDuplicate?: () => void
  onRemove?: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[0.8125rem] font-semibold text-heading">{label}</p>
      <div className="flex items-center gap-1">
        <IconButton label={enabled ? 'Ocultar' : 'Mostrar'} disabled={disabled} onClick={onToggle}>
          {enabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </IconButton>
        <IconButton label="Subir" disabled={disabled || !onUp} onClick={onUp}>
          <ArrowUp className="size-3.5" />
        </IconButton>
        <IconButton label="Bajar" disabled={disabled || !onDown} onClick={onDown}>
          <ArrowDown className="size-3.5" />
        </IconButton>
        <IconButton label="Duplicar" disabled={disabled || !onDuplicate} onClick={onDuplicate}>
          <Copy className="size-3.5" />
        </IconButton>
        <IconButton label="Quitar" disabled={disabled || !onRemove} onClick={onRemove} danger>
          <Trash2 className="size-3.5" />
        </IconButton>
      </div>
    </div>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  danger = false,
  children,
}: {
  label: string
  disabled?: boolean
  onClick?: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid size-8 place-items-center rounded-control border border-border text-muted-foreground transition-colors disabled:pointer-events-none disabled:opacity-35',
        danger ? 'hover:border-status-danger hover:text-status-danger' : 'hover:border-primary hover:text-primary',
      )}
    >
      {children}
    </button>
  )
}

function ItemList<T>({
  title,
  items,
  min,
  max,
  disabled,
  onChange,
  blank,
  render,
}: {
  title: string
  items: T[]
  min: number
  max: number
  disabled: boolean
  onChange: (items: T[]) => void
  blank: T
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode
}) {
  return (
    <Group title={`${title} (${items.length}/${max})`}>
      <ol className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="rounded-control border border-border bg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[0.75rem] font-semibold text-subtle-foreground">#{index + 1}</span>
              <div className="flex gap-1">
                <IconButton label="Subir" disabled={disabled || index === 0} onClick={() => onChange(swap(items, index, -1))}>
                  <ArrowUp className="size-3.5" />
                </IconButton>
                <IconButton label="Bajar" disabled={disabled || index === items.length - 1} onClick={() => onChange(swap(items, index, 1))}>
                  <ArrowDown className="size-3.5" />
                </IconButton>
                <IconButton label="Quitar" danger disabled={disabled || items.length <= min} onClick={() => onChange(items.filter((_, i) => i !== index))}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            </div>
            {render(item, (patch) => onChange(items.map((x, i) => (i === index ? { ...x, ...patch } : x))))}
          </li>
        ))}
      </ol>
      {items.length < max && !disabled ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { ...blank }])}>
          <Plus className="size-3.5" aria-hidden="true" />
          Agregar
        </Button>
      ) : null}
    </Group>
  )
}

/** Choose and order a subset of options. */
function OrderedPicker({
  values,
  options,
  disabled,
  onChange,
}: {
  values: string[]
  options: { value: string; label: string }[]
  disabled: boolean
  onChange: (values: string[]) => void
}) {
  const labelOf = (value: string) => options.find((o) => o.value === value)?.label ?? `${value} (no publicada)`
  const missing = options.filter((o) => !values.includes(o.value))
  return (
    <div className="space-y-2">
      <ol className="space-y-1.5">
        {values.map((value, index) => (
          <li key={value} className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-1.5">
            <span className="w-6 text-[0.75rem] font-semibold text-subtle-foreground">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-heading">{labelOf(value)}</span>
            <IconButton label="Subir" disabled={disabled || index === 0} onClick={() => onChange(swap(values, index, -1))}>
              <ArrowUp className="size-3.5" />
            </IconButton>
            <IconButton label="Bajar" disabled={disabled || index === values.length - 1} onClick={() => onChange(swap(values, index, 1))}>
              <ArrowDown className="size-3.5" />
            </IconButton>
            <IconButton label="Quitar" danger disabled={disabled || values.length <= 1} onClick={() => onChange(values.filter((v) => v !== value))}>
              <Trash2 className="size-3.5" />
            </IconButton>
          </li>
        ))}
      </ol>
      {missing.length > 0 && !disabled ? (
        <select
          className="admin-input max-w-sm"
          value=""
          onChange={(event) => event.target.value && onChange([...values, event.target.value])}
          aria-label="Agregar excursión"
        >
          <option value="">+ Agregar excursión…</option>
          {missing.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  )
}

function HeadingFields({
  value,
  disabled,
  onChange,
  errorPrefix,
  err,
}: {
  value: { eyebrow: string; title: string; description: string }
  disabled: boolean
  onChange: (value: { eyebrow: string; title: string; description: string }) => void
  errorPrefix: string
  err: (path: string) => string | undefined
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label="Antetítulo" value={value.eyebrow} max={80} disabled={disabled} onChange={(eyebrow) => onChange({ ...value, eyebrow })} error={err(`${errorPrefix}.eyebrow`)} />
      <TextField label="Título" value={value.title} max={140} disabled={disabled} onChange={(title) => onChange({ ...value, title })} error={err(`${errorPrefix}.title`)} />
      <TextArea className="sm:col-span-2" label="Bajada (opcional)" value={value.description} max={400} disabled={disabled} onChange={(description) => onChange({ ...value, description })} error={err(`${errorPrefix}.description`)} />
    </div>
  )
}

function ButtonFields({
  label,
  value,
  disabled,
  onChange,
  error,
}: {
  label: string
  value: { label: string; href: string }
  disabled: boolean
  onChange: (value: { label: string; href: string }) => void
  error?: string
}) {
  return (
    <fieldset className="rounded-control border border-border p-3">
      <legend className="px-1 text-[0.75rem] font-semibold text-muted-foreground">{label}</legend>
      <div className="grid gap-3">
        <TextField label="Texto" value={value.label} max={60} disabled={disabled} onChange={(text) => onChange({ ...value, label: text })} />
        <TextField label="Enlace" placeholder="/excursiones" value={value.href} max={300} disabled={disabled} onChange={(href) => onChange({ ...value, href })} error={error} />
      </div>
    </fieldset>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-panel border border-border bg-surface-muted p-4">
      <p className="text-[0.8125rem] font-semibold text-heading">{title}</p>
      {children}
    </div>
  )
}

function Note({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-[0.8125rem] text-subtle-foreground', className)}>{children}</p>
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-[0.8125rem] text-foreground">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  )
}

function TextField({
  label,
  value,
  max,
  disabled,
  onChange,
  error,
  placeholder,
  className,
}: {
  label: string
  value: string
  max: number
  disabled: boolean
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="admin-label flex justify-between">
        {label}
        <span className={cn('font-normal tabular', value.length > max * 0.9 ? 'text-status-warning' : 'text-subtle-foreground')}>
          {value.length}/{max}
        </span>
      </span>
      <input
        className="admin-input"
        value={value}
        maxLength={max}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <span className="mt-1 block text-[0.75rem] text-status-danger">{error}</span> : null}
    </label>
  )
}

function TextArea({
  label,
  value,
  max,
  disabled,
  onChange,
  error,
  className,
}: {
  label: string
  value: string
  max: number
  disabled: boolean
  onChange: (value: string) => void
  error?: string
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="admin-label flex justify-between">
        {label}
        <span className={cn('font-normal tabular', value.length > max * 0.9 ? 'text-status-warning' : 'text-subtle-foreground')}>
          {value.length}/{max}
        </span>
      </span>
      <textarea
        className="admin-input min-h-20"
        rows={3}
        value={value}
        maxLength={max}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <span className="mt-1 block text-[0.75rem] text-status-danger">{error}</span> : null}
    </label>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
  error,
}: {
  label: string
  value: number
  min: number
  max: number
  disabled: boolean
  onChange: (value: number) => void
  error?: string
}) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <input
        type="number"
        className="admin-input"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || min)))}
      />
      {error ? <span className="mt-1 block text-[0.75rem] text-status-danger">{error}</span> : null}
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  disabled: boolean
  onChange: (value: string) => void
}) {
  const known = options.some((o) => o.value === value)
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <select className="admin-input" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {!known ? <option value={value}>{value ? `${value} (no publicado)` : 'Elegir…'}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
