import { useId, useState, type ChangeEvent } from 'react'

export type NumberInputProps = {
  id?: string
  className?: string
  value: number
  onChange: (value: number) => void
  min?: number
  'aria-label'?: string
}

/**
 * A number field that can be emptied while typing. Committing on every
 * keystroke would reject the empty string as NaN and snap the old number
 * back, which makes clear-and-retype append instead of replace.
 */
export function NumberInput({
  id,
  className = 'k-input',
  value,
  onChange,
  min,
  'aria-label': ariaLabel,
}: NumberInputProps) {
  const [draft, setDraft] = useState(() => String(value))
  const [committed, setCommitted] = useState(value)

  if (value !== committed) {
    setCommitted(value)
    setDraft(String(value))
  }

  return (
    <input
      id={id}
      className={className}
      type="number"
      inputMode="numeric"
      min={min}
      aria-label={ariaLabel}
      value={draft}
      onChange={(event) => {
        const raw = event.target.value
        setDraft(raw)
        const parsed = Number.parseInt(raw, 10)
        if (Number.isNaN(parsed)) return
        onChange(min === undefined ? parsed : Math.max(min, parsed))
      }}
      onBlur={() => setDraft(String(value))}
    />
  )
}

export function Wordmark({ edition = 'Druhá edice' }: { edition?: string }) {
  return (
    <div className="k-wordmark">
      <span className="k-wordmark-name">Knave</span>
      <span className="k-wordmark-edition">{edition}</span>
    </div>
  )
}

export type InkFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/** A label over a dotted writing line, like JMÉNO or POVOLÁNÍ. */
export function InkField({
  label,
  value,
  onChange,
  placeholder,
}: InkFieldProps) {
  const id = useId()
  return (
    <div className="k-field">
      <label className="k-label" htmlFor={id}>
        {label}
      </label>
      <div className="k-field-rule">
        <input
          id={id}
          className="k-input"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  )
}

export type HexFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
}

/** A hexagon stat, like TZ or BZ. */
export function HexField({ label, value, onChange }: HexFieldProps) {
  const id = useId()
  return (
    <div className="k-hex">
      <label className="k-label" htmlFor={id}>
        {label}
      </label>
      <div className="k-hex-body">
        <div className="k-hex-inner">
          <NumberInput
            id={id}
            className="k-hex-input"
            value={value}
            onChange={onChange}
          />
        </div>
      </div>
    </div>
  )
}

export type RibbonFieldProps = {
  level: number
  xp: number
  onLevelChange: (level: number) => void
  onXpChange: (xp: number) => void
}

/** The ÚROVEŇ / ZK banner with the notched trailing edge. */
export function RibbonField({
  level,
  xp,
  onLevelChange,
  onXpChange,
}: RibbonFieldProps) {
  const levelId = useId()
  const xpId = useId()
  return (
    <div className="k-ribbon">
      <div className="k-ribbon-inner">
        <div className="k-ribbon-cell">
          <label className="k-label" htmlFor={levelId}>
            Úroveň
          </label>
          <NumberInput
            id={levelId}
            value={level}
            min={1}
            onChange={onLevelChange}
          />
        </div>
        <div className="k-ribbon-cell">
          <label className="k-label" htmlFor={xpId}>
            ZK
          </label>
          <NumberInput id={xpId} value={xp} min={0} onChange={onXpChange} />
        </div>
      </div>
    </div>
  )
}

export type PortraitFrameProps = {
  src?: string
  alt?: string
  /** Omit to render a read-only frame. */
  onSelect?: (dataUrl: string) => void
}

export function PortraitFrame({ src, alt, onSelect }: PortraitFrameProps) {
  const id = useId()

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !onSelect) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') onSelect(reader.result)
    })
    reader.readAsDataURL(file)
  }

  return (
    <div className="k-portrait">
      <span className="k-label">Portrét</span>
      <div className="k-portrait-frame">
        {src ? (
          <img className="k-portrait-img" src={src} alt={alt ?? ''} />
        ) : onSelect ? (
          <label className="k-portrait-empty" htmlFor={id}>
            Vyber obrázek
            <input
              id={id}
              type="file"
              accept="image/*"
              onChange={handleFile}
              hidden
            />
          </label>
        ) : (
          <span className="k-portrait-empty">Bez portrétu</span>
        )}
      </div>
    </div>
  )
}
