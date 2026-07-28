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
 */
export function HealthPennant({
  current,
  max,
  onCurrentChange,
  onMaxChange,
}: HealthPennantProps) {
  const maxId = useId()
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
          className="k-hex-input"
          value={max}
          min={1}
          onChange={onMaxChange}
        />
      </div>
      <span className="k-label">Živ</span>
      <div className="k-pennant-track">
        <div className="k-pennant-fills">
          {pips.map((point) => (
            <button
              key={point}
              type="button"
              className="k-pennant-pip"
              data-filled={point <= clamped}
              data-hurt={hurt}
              aria-label={`Nastavit životy na ${point}`}
              aria-pressed={point <= clamped}
              onClick={() =>
                onCurrentChange(point === clamped ? point - 1 : point)
              }
            />
          ))}
        </div>
      </div>
      <span className="k-pennant-readout">
        {clamped}/{safeMax}
      </span>
    </div>
  )
}
