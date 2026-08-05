import { useState } from 'react'
import { AbilityDial } from './AbilityDial'
import { HealthPennant } from './HealthPennant'
import { SendPanel, type SendTarget } from './SendPanel'
import { SlotList } from './SlotList'
import { NameMark, NotesField, RibbonField, ShieldField } from './fields'
import {
  ABILITIES,
  emptySlot,
  slotCapacity,
  stashCapacity,
  type Character,
} from './types'
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

  const onSelectToggle = sending
    ? (index: number) =>
        setPicked((current) =>
          current.includes(index)
            ? current.filter((item) => item !== index)
            : [...current, index],
        )
    : undefined

  const onSlotChange = (index: number, text: string) => {
    const slots = character.slots.slice()
    slots[index] = { ...slots[index], text }
    patch({ slots })
  }

  const onNoteChange = (index: number, note: string) => {
    const slots = character.slots.slice()
    slots[index] = { ...slots[index], note }
    patch({ slots })
  }

  const onWoundToggle = (index: number) => {
    const slots = character.slots.slice()
    slots[index] = { ...slots[index], wound: !slots[index].wound }
    patch({ slots })
  }

  const sendPanel = sending && (
    <SendPanel
      selectedCount={selected.length}
      targets={sendTargets}
      notice={sendNotice}
      onSend={(targetId) => onSend(targetId, selected)}
    />
  )

  // A stash is just item rows and a place to jot what they're for — no name,
  // abilities, level, or health track to render.
  if (character.kind === 'stash') {
    return (
      <div className="k-sheet k-sheet-stash" lang="cs">
        <div className="k-vitals-side">
          <NotesField
            value={character.notes}
            onChange={(notes) => patch({ notes })}
          />
          {sendPanel}
        </div>

        <SlotList
          slots={character.slots}
          capacity={stashCapacity(character)}
          selected={sending ? selected : undefined}
          onSelectToggle={onSelectToggle}
          onSlotChange={onSlotChange}
          onNoteChange={onNoteChange}
          onWoundToggle={onWoundToggle}
          onAddRow={() => patch({ slots: [...character.slots, emptySlot()] })}
          onRemoveRow={(index) => {
            if (character.slots.length <= 1) return
            const slots = character.slots.slice()
            slots.splice(index, 1)
            patch({ slots })
          }}
        />
      </div>
    )
  }

  return (
    // The sheet is written in Czech, and the browser has to be told so before
    // it will hyphenate INTELIGENCE on a syllable rather than breaking it
    // wherever the six ability names happen to run out of room.
    <div className="k-sheet" lang="cs" data-dead={character.dead}>
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
              <ShieldField
                label="Brnění"
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
            {/* The notes keep their own height whatever the health track does,
                and the send table lines up with them, not with the whole
                column. */}
            <div className="k-vitals-side">
              <NotesField
                value={character.notes}
                onChange={(notes) => patch({ notes })}
              />

              {sendPanel}
            </div>
          </div>
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
            onSelectToggle={onSelectToggle}
            onSlotChange={onSlotChange}
            onNoteChange={onNoteChange}
            onWoundToggle={onWoundToggle}
          />
        </div>
      </div>
    </div>
  )
}
