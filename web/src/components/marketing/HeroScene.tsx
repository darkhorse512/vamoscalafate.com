/**
 * Hero backdrop: a wide, cinematic Patagonian scene.
 *
 * Shown until a real photograph is uploaded. Deliberately hand-composed
 * rather than seeded — this is the single most important frame on the site,
 * and it should read as a specific place: a glacier front calving into
 * Lago Argentino, with the cordillera behind it.
 *
 * Inline SVG, so it costs no request, scales to any viewport without a
 * srcset, and paints with the first HTML response — the hero heading is the
 * LCP element and nothing blocks it.
 */
export function HeroScene() {
  return (
    <div className="absolute inset-0 bg-lenga-950">
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
        aria-hidden="true"
      >
        <defs>
          {/* Cold dusk: deep blue overhead warming towards the horizon. */}
          <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b3450" />
            <stop offset="38%" stopColor="#2d5a76" />
            <stop offset="68%" stopColor="#5d93ad" />
            <stop offset="88%" stopColor="#9dbecd" />
            <stop offset="100%" stopColor="#c4d8e2" />
          </linearGradient>

          <radialGradient id="hero-sun" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor="#ffe9cc" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#ffd2a1" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ffd2a1" stopOpacity="0" />
          </radialGradient>

          {/* Haze that separates each range from the one behind it. */}
          <linearGradient id="hero-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bcd6e3" stopOpacity="0" />
            <stop offset="100%" stopColor="#bcd6e3" stopOpacity="0.55" />
          </linearGradient>

          <linearGradient id="hero-ice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eaf6fb" />
            <stop offset="55%" stopColor="#b6d9e8" />
            <stop offset="100%" stopColor="#6fa8c4" />
          </linearGradient>

          <linearGradient id="hero-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5e93ab" />
            <stop offset="35%" stopColor="#2f6683" />
            <stop offset="100%" stopColor="#10222f" />
          </linearGradient>

          <linearGradient id="hero-fore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16302b" />
            <stop offset="100%" stopColor="#0c1d1a" />
          </linearGradient>
        </defs>

        <rect width="1600" height="900" fill="url(#hero-sky)" />

        {/* Low sun behind the range */}
        <circle cx="1180" cy="415" r="230" fill="url(#hero-sun)" />
        <circle cx="1180" cy="415" r="26" fill="#fff1de" opacity="0.75" />

        {/* ── Far cordillera ───────────────────────────────────────── */}
        <path
          d="M0 470 C 90 430, 150 392, 232 404 C 300 414, 338 372, 410 352
             C 486 331, 534 378, 612 366 C 690 354, 726 306, 812 318
             C 892 329, 930 380, 1014 372 C 1098 364, 1140 324, 1226 338
             C 1310 352, 1352 398, 1436 386 C 1506 376, 1548 408, 1600 396
             L 1600 900 L 0 900 Z"
          fill="#4a7b96"
          opacity="0.5"
        />
        {/* Snow line: a highlight stroked along the range's OWN edge, so it
            cannot drift off the curve the way separate shapes do. */}
        <path
          d="M0 470 C 90 430, 150 392, 232 404 C 300 414, 338 372, 410 352
             C 486 331, 534 378, 612 366 C 690 354, 726 306, 812 318
             C 892 329, 930 380, 1014 372 C 1098 364, 1140 324, 1226 338
             C 1310 352, 1352 398, 1436 386 C 1506 376, 1548 408, 1600 396"
          fill="none"
          stroke="#e8f4fa"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.3"
        />
        <rect y="330" width="1600" height="180" fill="url(#hero-haze)" opacity="0.6" />

        {/* ── Mid range ────────────────────────────────────────────── */}
        <path
          d="M0 540 C 110 512, 178 466, 268 480 C 352 493, 398 442, 486 428
             C 578 414, 622 470, 714 464 C 800 458, 846 410, 936 424
             C 1028 438, 1072 486, 1166 476 C 1254 466, 1300 430, 1392 444
             C 1478 457, 1530 492, 1600 480 L 1600 900 L 0 900 Z"
          fill="#2f5d7a"
          opacity="0.85"
        />
        <path
          d="M0 540 C 110 512, 178 466, 268 480 C 352 493, 398 442, 486 428
             C 578 414, 622 470, 714 464 C 800 458, 846 410, 936 424
             C 1028 438, 1072 486, 1166 476 C 1254 466, 1300 430, 1392 444
             C 1478 457, 1530 492, 1600 480"
          fill="none"
          stroke="#f0f8fc"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.42"
        />
        <rect y="420" width="1600" height="150" fill="url(#hero-haze)" opacity="0.3" />

        {/* ── Glacier front — the subject of the frame ─────────────── */}
        <g>
          <path
            d="M250 620 L 250 556 L 292 566 L 300 540 L 338 552 L 352 522
               L 392 540 L 404 512 L 448 530 L 462 502 L 508 522 L 520 496
               L 566 516 L 580 490 L 628 512 L 642 486 L 690 508 L 704 482
               L 752 504 L 768 480 L 816 502 L 832 476 L 880 500 L 896 478
               L 944 502 L 960 482 L 1006 506 L 1020 488 L 1064 512
               L 1078 494 L 1120 518 L 1132 502 L 1172 526 L 1172 620 Z"
            fill="url(#hero-ice)"
          />
          {/* Crevasse shadows give the ice depth */}
          <g stroke="#7db3cd" strokeWidth="2" opacity="0.4">
            <path d="M352 522 L 358 620" />
            <path d="M462 502 L 470 620" />
            <path d="M580 490 L 588 620" />
            <path d="M704 482 L 710 620" />
            <path d="M832 476 L 838 620" />
            <path d="M960 482 L 966 620" />
            <path d="M1078 494 L 1084 620" />
          </g>
          {/* Bright upper lip */}
          <path
            d="M250 556 L 292 566 L 300 540 L 338 552 L 352 522 L 392 540
               L 404 512 L 448 530 L 462 502 L 508 522 L 520 496 L 566 516
               L 580 490 L 628 512 L 642 486 L 690 508 L 704 482 L 752 504
               L 768 480 L 816 502 L 832 476 L 880 500 L 896 478 L 944 502
               L 960 482 L 1006 506 L 1020 488 L 1064 512 L 1078 494
               L 1120 518 L 1132 502 L 1172 526"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            opacity="0.7"
          />
        </g>

        {/* ── Lago Argentino ──────────────────────────────────────── */}
        <rect y="620" width="1600" height="280" fill="url(#hero-water)" />
        <rect y="620" width="1600" height="3" fill="#dceef6" opacity="0.5" />

        {/* Reflection of the ice front, compressed and faded */}
        <g transform="translate(0 1240) scale(1 -0.3)" opacity="0.18">
          <path
            d="M250 620 L 250 556 L 352 522 L 462 502 L 580 490 L 704 482
               L 832 476 L 960 482 L 1078 494 L 1172 526 L 1172 620 Z"
            fill="#eaf6fb"
          />
        </g>

        {/* Icebergs */}
        <ellipse cx="380" cy="700" rx="64" ry="9" fill="#dceef6" opacity="0.5" />
        <ellipse cx="900" cy="742" rx="88" ry="11" fill="#dceef6" opacity="0.38" />
        <ellipse cx="1320" cy="690" rx="52" ry="8" fill="#dceef6" opacity="0.42" />
        <ellipse cx="620" cy="800" rx="46" ry="7" fill="#dceef6" opacity="0.22" />

        {/* ── Foreground headland, anchoring the composition ──────── */}
        <path
          d="M0 812 C 180 780, 300 806, 430 828 C 470 835, 500 846, 520 860
             L 520 900 L 0 900 Z"
          fill="url(#hero-fore)"
        />
        <path
          d="M1600 792 C 1450 772, 1330 800, 1210 826 C 1160 837, 1120 852, 1096 868
             L 1096 900 L 1600 900 Z"
          fill="url(#hero-fore)"
        />
      </svg>
    </div>
  )
}
