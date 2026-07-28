export type SlotListProps = {
  slots: string[]
  /** Rows past this are printed but struck through. */
  capacity: number
  onSlotChange: (index: number, value: string) => void
}

/** The numbered item rows, two columns on the printed sheet. */
export function SlotList({ slots, capacity, onSlotChange }: SlotListProps) {
  const used = slots.filter((slot) => slot.trim() !== '').length
  const over = used > capacity

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
          return (
            <div className="k-slot" key={index} data-beyond={beyond}>
              <span className="k-slot-index" aria-hidden="true">
                {index + 1}
              </span>
              <input
                className="k-input"
                value={slot}
                aria-label={`Řádek ${index + 1}${beyond ? ' (nad kapacitu)' : ''}`}
                onChange={(event) => onSlotChange(index, event.target.value)}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
