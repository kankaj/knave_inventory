import { IconMinus, IconPlus } from './icons'
import { slotTaken, type Slot } from './types'

export type SlotListProps = {
  slots: Slot[]
  /** Rows past this are printed but struck through. */
  capacity: number
  onSlotChange: (index: number, text: string) => void
  onNoteChange: (index: number, note: string) => void
  onWoundToggle: (index: number) => void
  /** Rows picked for sending. Omit to hide the send checkboxes entirely. */
  selected?: readonly number[]
  onSelectToggle?: (index: number) => void
  /** A grown/shrunk row count (stash only). Omit for the fixed character grid. */
  onAddRow?: () => void
  onRemoveRow?: (index: number) => void
}

/**
 * The numbered rows in one column: carried items and wounds share the same
 * capacity, and every row carries a note written beside it.
 */
export function SlotList({
  slots,
  capacity,
  onSlotChange,
  onNoteChange,
  onWoundToggle,
  selected,
  onSelectToggle,
  onAddRow,
  onRemoveRow,
}: SlotListProps) {
  const used = slots.filter(slotTaken).length
  const over = used > capacity
  const picking = selected !== undefined && onSelectToggle !== undefined
  const resizing = onAddRow !== undefined && onRemoveRow !== undefined

  return (
    <section className="k-slots" aria-label="Předměty">
      <header className="k-slots-head">
        <span className="k-label">Předměty</span>
        {/* Being overloaded is said in words as well as in red ink, so the
            colour is never the only thing carrying it. */}
        <span className="k-slots-count" data-over={over} role="status">
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
              data-resizing={resizing}
            >
              {picking && (
                // The drawn box keeps its printed size; the label around it is
                // what a fingertip actually has to hit.
                <label className="k-slot-pick-hit">
                  <input
                    type="checkbox"
                    className="k-slot-pick"
                    checked={selected.includes(index)}
                    disabled={!sendable}
                    aria-label={`Poslat řádek ${index + 1}`}
                    onChange={() => onSelectToggle(index)}
                  />
                </label>
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
              <input
                className="k-input k-slot-note"
                value={slot.note}
                placeholder="Poznámka"
                aria-label={`Poznámka k řádku ${index + 1}`}
                onChange={(event) => onNoteChange(index, event.target.value)}
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
              {resizing && (
                <button
                  type="button"
                  className="k-slot-remove"
                  disabled={slots.length <= 1 || slotTaken(slot)}
                  title="Odebrat řádek"
                  aria-label={`Odebrat řádek ${index + 1}`}
                  onClick={() => onRemoveRow(index)}
                >
                  <IconMinus />
                </button>
              )}
            </div>
          )
        })}
      </div>
      {onAddRow && (
        <button type="button" className="k-slots-add" onClick={onAddRow}>
          <IconPlus size={0.95} />
          řádek
        </button>
      )}
    </section>
  )
}
