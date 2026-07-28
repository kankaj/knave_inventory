import { slotTaken, type Slot } from './types'

export type SlotListProps = {
  slots: Slot[]
  /** Rows past this are printed but struck through. */
  capacity: number
  onSlotChange: (index: number, text: string) => void
  onWoundToggle: (index: number) => void
  /** Rows picked for sending. Omit to hide the send checkboxes entirely. */
  selected?: readonly number[]
  onSelectToggle?: (index: number) => void
}

/** The numbered rows: carried items and wounds share the same capacity. */
export function SlotList({
  slots,
  capacity,
  onSlotChange,
  onWoundToggle,
  selected,
  onSelectToggle,
}: SlotListProps) {
  const used = slots.filter(slotTaken).length
  const over = used > capacity
  const picking = selected !== undefined && onSelectToggle !== undefined

  return (
    <section className="k-slots" aria-label="Předměty">
      <header className="k-slots-head">
        <span className="k-label">Předměty</span>
        <span className="k-slots-count" data-over={over}>
          {over ? `Přetížen ${used}/${capacity}` : `${used}/${capacity}`}
        </span>
      </header>
      <div className="k-slots-grid">
        {slots.map((slot, index) => {
          const beyond = index >= capacity
          const sendable = !slot.wound && slot.text.trim() !== ''
          return (
            <div
              className="k-slot"
              key={index}
              data-beyond={beyond}
              data-wound={slot.wound}
              data-picking={picking}
            >
              {picking && (
                <input
                  type="checkbox"
                  className="k-slot-pick"
                  checked={selected.includes(index)}
                  disabled={!sendable}
                  aria-label={`Poslat řádek ${index + 1}`}
                  onChange={() => onSelectToggle(index)}
                />
              )}
              <span className="k-slot-index" aria-hidden="true">
                {index + 1}
              </span>
              <input
                className="k-input k-slot-text"
                value={slot.text}
                aria-label={`Řádek ${index + 1}${beyond ? ' (nad kapacitu)' : ''}`}
                onChange={(event) => onSlotChange(index, event.target.value)}
              />
              <button
                type="button"
                className="k-slot-wound"
                aria-pressed={slot.wound}
                title={slot.wound ? 'Zrušit zranění' : 'Označit jako zranění'}
                aria-label={
                  slot.wound
                    ? `Zrušit zranění na řádku ${index + 1}`
                    : `Označit řádek ${index + 1} jako zranění`
                }
                onClick={() => onWoundToggle(index)}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
