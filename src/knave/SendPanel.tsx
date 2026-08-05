import { useRef, useState, type KeyboardEvent } from 'react'

export type SendTarget = {
  id: string
  name: string
  /** Rows the recipient can still take. */
  freeRows: number
}

export type SendPanelProps = {
  /** How many rows are ticked for sending. */
  selectedCount: number
  targets: SendTarget[]
  onSend: (targetId: string) => void
  /** Result of the last attempt, shown as-is. */
  notice?: string
}

/** Which way an arrow key moves along the row of recipients. */
const STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
}

/**
 * Pick the recipient for the ticked items and hand them over. Dead characters
 * are never offered: they can give things away but cannot take any.
 *
 * The recipients are a real radio group: one tab stop for the whole row, with
 * arrows to move inside it. Announcing them as radios while leaving each one
 * its own tab stop was the half of the pattern that makes it worse than plain
 * buttons.
 */
export function SendPanel({
  selectedCount,
  targets,
  onSend,
  notice,
}: SendPanelProps) {
  const [targetId, setTargetId] = useState('')
  const target = targets.find((candidate) => candidate.id === targetId)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  // Nothing picked yet: the first recipient holds the group's tab stop, so the
  // group is always reachable without being chosen for you.
  const picked = targets.findIndex((candidate) => candidate.id === targetId)
  const stop = picked >= 0 ? picked : 0

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = STEPS[event.key]
    const next =
      step !== undefined
        ? (index + step + targets.length) % targets.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? targets.length - 1
            : -1
    if (next < 0) return
    event.preventDefault()
    setTargetId(targets[next].id)
    buttons.current[next]?.focus()
  }

  return (
    <section className="k-send" aria-label="Poslat předměty">
      <header className="k-send-head">
        <span className="k-label">Poslat komu</span>
        <span className="k-send-count">
          {selectedCount === 0
            ? 'Zaškrtni předměty v seznamu'
            : `Vybráno ${selectedCount}`}
        </span>
      </header>

      {targets.length === 0 ? (
        <p className="k-send-empty">Nikdo živý tu nemá list.</p>
      ) : (
        <>
          <div
            className="k-send-targets"
            role="radiogroup"
            aria-label="Příjemce"
          >
            {targets.map((candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                role="radio"
                className="k-send-target"
                ref={(node) => {
                  buttons.current[index] = node
                }}
                tabIndex={index === stop ? 0 : -1}
                aria-checked={candidate.id === targetId}
                // A bare number beside the name means nothing read aloud.
                aria-label={`${candidate.name}, volných řádků ${candidate.freeRows}`}
                data-active={candidate.id === targetId}
                onKeyDown={(event) => move(event, index)}
                onClick={() => setTargetId(candidate.id)}
              >
                <span className="k-send-target-name">{candidate.name}</span>
                <span className="k-send-target-free" aria-hidden="true">
                  {candidate.freeRows}
                </span>
              </button>
            ))}
          </div>
          {/* Said once, in the open: a number explained only by a title
              attribute is a number a touchscreen never explains at all. */}
          <p className="k-send-legend">Číslo u jména je počet volných řádků.</p>
        </>
      )}

      <div className="k-send-foot">
        <button
          type="button"
          className="k-app-action"
          disabled={selectedCount === 0 || target === undefined}
          onClick={() => target && onSend(target.id)}
        >
          Poslat
        </button>
        {notice && (
          <span className="k-send-notice" role="status">
            {notice}
          </span>
        )}
      </div>
    </section>
  )
}
