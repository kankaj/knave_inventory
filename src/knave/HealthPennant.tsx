import { useId } from 'react'
import { NumberInput } from './fields'

export type HealthPennantProps = {
  current: number
  max: number
  onCurrentChange: (current: number) => void
  onMaxChange: (max: number) => void
}

/**
 * The vertical ŽIV track. Every hit point is one pip; clicking a pip sets the
 * current total, so taking 3 damage is one click instead of arithmetic.
 * Clicking the lowest filled pip empties the track.
 *
 * The pips are the quick way in, not the only one: reaching the twentieth of
 * them from a keyboard used to mean twenty tab stops in the middle of the
 * sheet. They are off the tab ring now, and the ŽIV field under the track does
 * the same job in one stop.
 */
export function HealthPennant({
  current,
  max,
  onCurrentChange,
  onMaxChange,
}: HealthPennantProps) {
  const maxId = useId()
  const currentId = useId()
  const safeMax = Math.max(1, max)
  const clamped = Math.min(Math.max(0, current), safeMax)
  const hurt = clamped <= Math.ceil(safeMax / 3)

  // Top pip is the highest hit point, so the ink drains downwards.
  const pips = Array.from({ length: safeMax }, (_, index) => safeMax - index)

  return (
    <div className="k-pennant">
      <label className="k-label" htmlFor={maxId}>
        Max živ
      </label>
      <div className="k-pennant-max">
        <NumberInput
          id={maxId}
          className="k-num-input"
          value={max}
          min={1}
          onChange={onMaxChange}
        />
      </div>
      <label className="k-label" htmlFor={currentId}>
        Živ
      </label>
      <div className="k-pennant-track">
        <div className="k-pennant-fills">
          {pips.map((point) => (
            <button
              key={point}
              type="button"
              className="k-pennant-pip"
              data-filled={point <= clamped}
              data-hurt={hurt}
              tabIndex={-1}
              aria-label={`Nastavit životy na ${point}`}
              aria-pressed={point <= clamped}
              onClick={() =>
                onCurrentChange(point === clamped ? point - 1 : point)
              }
            />
          ))}
        </div>
      </div>
      <p className="k-pennant-readout">
        <NumberInput
          id={currentId}
          className="k-num-input"
          value={clamped}
          min={0}
          max={safeMax}
          onChange={onCurrentChange}
        />
        <span aria-hidden="true">/{safeMax}</span>
      </p>
    </div>
  )
}
