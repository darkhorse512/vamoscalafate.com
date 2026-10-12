'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Self-hosted video, played on demand.
 *
 * `preload="none"` and a poster image are the whole point: the file is tens of
 * megabytes, most visitors scroll past, and an autoplaying hero video would
 * spend their data before they chose to watch. Nothing is fetched until the
 * play button is pressed.
 *
 * The first press swaps the poster for a real <video> with `controls` and
 * calls `play()`, so the browser's own player - with its captions, volume and
 * fullscreen - handles everything after that. A custom control bar here would
 * be a worse version of something every browser already ships, including on
 * the platforms where it is a system UI (iOS fullscreen).
 *
 * `aspect` names the shape of the source. Vertical footage shot on a phone is
 * framed as a phone: letterboxing it into 16:9 would waste two thirds of the
 * width and shrink the subtitles burnt into the picture.
 */
export function VideoPlayer({
  src,
  poster,
  title,
  aspect = 'vertical',
  className,
}: {
  src: string
  poster?: string | null
  title: string
  aspect?: 'vertical' | 'wide' | 'square'
  className?: string
}) {
  const [started, setStarted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const ratio = {
    vertical: 'aspect-[9/16]',
    wide: 'aspect-video',
    square: 'aspect-square',
  }[aspect]

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.5rem] bg-navy-950 shadow-float ring-1 ring-white/10',
        ratio,
        className,
      )}
    >
      {started ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster ?? undefined}
          controls
          autoPlay
          playsInline
          preload="auto"
          className="size-full object-contain"
        >
          {/* No caption track: the subtitles are burnt into the picture. */}
        </video>
      ) : (
        <button
          type="button"
          onClick={() => setStarted(true)}
          aria-label={`Reproducir: ${title}`}
          className="group absolute inset-0 grid place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          {poster ? (
            <Image
              src={poster}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 24rem, 90vw"
              className="object-cover"
            />
          ) : null}
          {/* Darkened so the white play button holds its contrast on any frame. */}
          <span className="absolute inset-0 bg-navy-950/25 transition-colors group-hover:bg-navy-950/10" aria-hidden="true" />
          <span
            className="relative grid size-16 place-items-center rounded-full bg-white/95 text-navy-900 shadow-float transition-transform duration-200 group-hover:scale-105 sm:size-20"
            aria-hidden="true"
          >
            <Play className="ml-1 size-7 fill-current sm:size-8" />
          </span>
        </button>
      )}
    </div>
  )
}
