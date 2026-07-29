import { useState } from 'react'
import { AbilityDial } from './AbilityDial'
import { HealthPennant } from './HealthPennant'
import { SendPanel, type SendTarget } from './SendPanel'
import { SlotList } from './SlotList'
import { HexField, NameMark, NotesField, RibbonField } from './fields'
import { ABILITIES, slotCapacity, type Character } from './types'
import './sheet.css'

export type CharacterSheetProps = {
  character: Character
  onChange: (next: Character) => void
  /** Recipients for handing items over. Omit to hide the send panel. */
  sendTargets?: SendTarget[]
  onSend?: (targetId: string, indices: number[]) => void
  /** Outcome of the last send attempt. */
  sendNotice?: string
}

/**
 * The sheet reads across rather than down: the name, abilities and vitals fill
 * the left, the item column and its notes the right.
 */
export function CharacterSheet({
  character,
  onChange,
  sendTargets,
  onSend,
  sendNotice,
}: CharacterSheetProps) {
  const [picked, setPicked] = useState<number[]>([])

  const patch = (changes: Partial<Character>) =>
    onChange({ ...character, ...changes })

  const sendable = (index: number) => {
    const slot = character.slots[index]
    return slot !== undefined && !slot.wound && slot.text.trim() !== ''
  }

  // Rows emptied by a completed send drop out of the selection on their own.
  const selected = picked.filter(sendable)
  const sending = sendTargets !== undefined && onSend !== undefined

  return (
    <div className="k-sheet" data-dead={character.dead}>
      <div className="k-sheet-main">
        <div className="k-sheet-left">
          <NameMark
            value={character.name}
            struck={character.dead}
            onChange={(name) => patch({ name })}
          />

          <div className="k-dials">
            {ABILITIES.map((ability) => (
              <AbilityDial
                key={ability.key}
                ability={ability}
                value={character.abilities[ability.key]}
                onChange={(value) =>
                  patch({
                    abilities: { ...character.abilities, [ability.key]: value },
                  })
                }
              />
            ))}
          </div>

          <div className="k-vitals">
            <div className="k-vitals-stack">
              <HexField
                label="Štít"
                value={character.shield}
                onChange={(shield) => patch({ shield })}
              />
              <HealthPennant
                current={character.hp.current}
                max={character.hp.max}
                onCurrentChange={(current) =>
                  patch({ hp: { ...character.hp, current } })
                }
                onMaxChange={(max) =>
                  patch({
                    hp: { max, current: Math.min(character.hp.current, max) },
                  })
                }
              />
            </div>
            <NotesField
              value={character.notes}
              onChange={(notes) => patch({ notes })}
            />
          </div>

          {sending && (
            <SendPanel
              selectedCount={selected.length}
              targets={sendTargets}
              notice={sendNotice}
              onSend={(targetId) => onSend(targetId, selected)}
            />
          )}
        </div>

        <div className="k-sheet-right">
          <RibbonField
            level={character.level}
            xp={character.xp}
            onLevelChange={(level) => patch({ level })}
            onXpChange={(xp) => patch({ xp })}
          />

          <SlotList
            slots={character.slots}
            capacity={slotCapacity(character)}
            selected={sending ? selected : undefined}
            onSelectToggle={
              sending
                ? (index) =>
                    setPicked((current) =>
                      current.includes(index)
                        ? current.filter((item) => item !== index)
                        : [...current, index],
                    )
                : undefined
            }
            onSlotChange={(index, text) => {
              const slots = character.slots.slice()
              slots[index] = { ...slots[index], text }
              patch({ slots })
            }}
            onNoteChange={(index, note) => {
              const slots = character.slots.slice()
              slots[index] = { ...slots[index], note }
              patch({ slots })
            }}
            onWoundToggle={(index) => {
              const slots = character.slots.slice()
              slots[index] = { ...slots[index], wound: !slots[index].wound }
              patch({ slots })
            }}
          />
        </div>
      </div>
    </div>
  )
}
