const GOLD_GRADIENT = 'linear-gradient(135deg, #7b541d 0%, #b8872a 24%, #e3c07b 48%, #f6e6c3 55%, #cb9d46 72%, #8b6221 100%)'
const SURFACE_GRADIENT = 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.98), rgba(247,240,232,0.96) 38%, rgba(232,221,210,0.82) 100%)'
const LINE_GRADIENT = 'linear-gradient(90deg, rgba(201,168,76,0) 0%, rgba(201,168,76,0.82) 50%, rgba(201,168,76,0) 100%)'

const SIZE_MAP = {
  sm: {
    mark: 'w-10 h-10 rounded-[14px]',
    inner: 'inset-[4px] rounded-[10px]',
    topLine: 'left-2.5 right-4 top-2.5',
    monogram: 'text-[2rem]',
    sparkle: 'w-3.5 h-3.5 bottom-2 right-2',
    word: 'text-[1.45rem]',
    stackedWord: 'text-[2.2rem]',
    gap: 'gap-2',
    stackGap: 'gap-4',
  },
  md: {
    mark: 'w-12 h-12 rounded-[16px]',
    inner: 'inset-[5px] rounded-[12px]',
    topLine: 'left-3 right-5 top-3',
    monogram: 'text-[2.45rem]',
    sparkle: 'w-4 h-4 bottom-2.5 right-2.5',
    word: 'text-[1.72rem]',
    stackedWord: 'text-[2.65rem]',
    gap: 'gap-4',
    stackGap: 'gap-5',
  },
  lg: {
    mark: 'w-20 h-20 rounded-[24px]',
    inner: 'inset-[8px] rounded-[18px]',
    topLine: 'left-5 right-8 top-5',
    monogram: 'text-[4rem]',
    sparkle: 'w-5 h-5 bottom-4 right-4',
    word: 'text-[2.2rem]',
    stackedWord: 'text-[4.5rem]',
    gap: 'gap-5',
    stackGap: 'gap-6',
  },
}

function Sparkle({ className = '' }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        d="M10 0L12.25 7.75L20 10L12.25 12.25L10 20L7.75 12.25L0 10L7.75 7.75L10 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

function BrandMark({ size }) {
  const config = SIZE_MAP[size]

  return (
    <div
      className={`relative shrink-0 border border-[#c9a84c]/45 ${config.mark}`}
      style={{
        backgroundImage: SURFACE_GRADIENT,
        boxShadow: '0 12px 30px rgba(139, 111, 71, 0.08)',
      }}
    >
      <span className={`absolute border border-white/50 pointer-events-none ${config.inner}`} />
      <span className={`absolute h-px pointer-events-none ${config.topLine}`} style={{ backgroundImage: LINE_GRADIENT }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-serif font-semibold leading-none bg-clip-text text-transparent ${config.monogram}`}
          style={{ backgroundImage: GOLD_GRADIENT }}
        >
          R
        </span>
      </div>
      <Sparkle className={`absolute text-[#c9a84c] ${config.sparkle}`} />
    </div>
  )
}

function Wordmark({ stacked, size, align }) {
  const config = SIZE_MAP[size]
  const centered = align === 'center'

  return (
    <div className={centered ? 'text-center' : 'text-left'}>
      <div
        className={`font-serif font-semibold uppercase leading-none bg-clip-text text-transparent ${stacked ? config.stackedWord : config.word}`}
        style={{
          backgroundImage: GOLD_GRADIENT,
          letterSpacing: stacked ? '0.32em' : '0.28em',
          paddingLeft: stacked ? '0.32em' : '0.28em',
        }}
      >
        REVA
      </div>
      {stacked ? (
        <span
          className={`mt-3 block h-px w-20 ${centered ? 'mx-auto' : ''}`}
          style={{ backgroundImage: LINE_GRADIENT }}
        />
      ) : null}
    </div>
  )
}

export default function BrandLogo({
  variant = 'full',
  size = 'md',
  align = 'left',
  className = '',
}) {
  const config = SIZE_MAP[size]
  const centered = align === 'center'
  // Always vertically center items; text alignment still follows `align`
  const alignmentClass = centered ? 'items-center text-center' : 'items-center text-left'

  if (variant === 'mark') {
    return <BrandMark size={size} />
  }

  if (variant === 'stacked') {
    return (
      <div className={`inline-flex flex-col ${alignmentClass} ${config.stackGap} ${className}`.trim()}>
        <BrandMark size={size} />
        <Wordmark stacked size={size} align={align} />
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center ${alignmentClass} ${config.gap} ${className}`.trim()}>
      <BrandMark size={size} />
      <Wordmark size={size} align={align} />
    </div>
  )
}