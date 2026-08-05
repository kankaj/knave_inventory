import { useId, useState } from 'react'

export type NumberInputProps = {
  id?: string
  className?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  'aria-label'?: string
  'aria-describedby'?: string
}

/**
 * A number field that can be emptied while typing. Committing on every
 * keystroke would reject the empty string as NaN and snap the old number
 * back, which makes clear-and-retype append instead of replace. Anything
 * outside the range is rewritten to the nearest allowed number as it is
 * typed, so a bonus of 11 can never end up on the sheet.
 */
export function NumberInput({
  id,
  className = 'k-input',
  value,
  onChange,
  min,
  max,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
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
      max={max}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      value={draft}
      // A number field under the pointer answers the wheel, so scrolling the
      // sheet past a focused one silently rewrote it. Dropping focus first
      // turns the gesture back into plain scrolling.
      onWheel={(event) => event.currentTarget.blur()}
      onChange={(event) => {
        const raw = event.target.value
        const parsed = Number.parseInt(raw, 10)
        if (Number.isNaN(parsed)) {
          setDraft(raw)
          return
        }
        const floored = min === undefined ? parsed : Math.max(min, parsed)
        const bounded = max === undefined ? floored : Math.min(max, floored)
        setDraft(bounded === parsed ? raw : String(bounded))
        onChange(bounded)
      }}
      onBlur={() => setDraft(String(value))}
    />
  )
}

export type NameMarkProps = {
  value: string
  onChange: (value: string) => void
  /** Struck through, for the name of a dead character. */
  struck?: boolean
}

/**
 * The character's name written where the logo used to sit, in the same
 * blackletter face. It doubles as the sheet's only name field.
 */
export function NameMark({ value, onChange, struck = false }: NameMarkProps) {
  return (
    <input
      className="k-namemark"
      aria-label="Jméno"
      data-struck={struck}
      value={value}
      placeholder="Jméno"
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export type ShieldFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
}

/**
 * A stat written inside a shield, for BRNĚNÍ. The shield is the field itself:
 * the number is typed straight into it, not beside a decorative icon.
 */
export function ShieldField({
  label,
  value,
  onChange,
  min = 0,
}: ShieldFieldProps) {
  const id = useId()
  return (
    <div className="k-shield">
      <label className="k-label" htmlFor={id}>
        {label}
      </label>
      <div className="k-shield-body">
        <div className="k-shield-inner">
          <NumberInput
            id={id}
            className="k-num-input k-shield-input"
            value={value}
            min={min}
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

export type NotesFieldProps = {
  value: string
  onChange: (value: string) => void
}

/** Plain scratch space beside the vitals. */
export function NotesField({ value, onChange }: NotesFieldProps) {
  const id = useId()
  return (
    <div className="k-notes">
      <label className="k-label" htmlFor={id}>
        Poznámky
      </label>
      <textarea
        id={id}
        className="k-notes-area"
        value={value}
        placeholder="Cokoli si chceš zapsat"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
