import { useState } from 'react'

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

/**
 * Pick the recipient for the ticked items and hand them over. Dead characters
 * are never offered: they can give things away but cannot take any.
 */
export function SendPanel({
  selectedCount,
  targets,
  onSend,
  notice,
}: SendPanelProps) {
  const [targetId, setTargetId] = useState('')
  const target = targets.find((candidate) => candidate.id === targetId)

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
        <div className="k-send-targets" role="radiogroup" aria-label="Příjemce">
          {targets.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role="radio"
              className="k-send-target"
              aria-checked={candidate.id === targetId}
              data-active={candidate.id === targetId}
              onClick={() => setTargetId(candidate.id)}
            >
              <span className="k-send-target-name">{candidate.name}</span>
              <span className="k-send-target-free" title="Volné řádky">
                {candidate.freeRows}
              </span>
            </button>
          ))}
        </div>
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
