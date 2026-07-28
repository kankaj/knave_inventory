import { useState } from 'react'
import { AbilityDial } from './AbilityDial'
import { HealthPennant } from './HealthPennant'
import { SendPanel, type SendTarget } from './SendPanel'
import { SlotList } from './SlotList'
import {
  HexField,
  InkField,
  PortraitFrame,
  RibbonField,
  Wordmark,
} from './fields'
import { ABILITIES, slotCapacity, type Character } from './types'
import './sheet.css'

export type CharacterSheetProps = {
  character: Character
  onChange: (next: Character) => void
  portraitEditable?: boolean
  /** Recipients for handing items over. Omit to hide the send panel. */
  sendTargets?: SendTarget[]
  onSend?: (targetId: string, indices: number[]) => void
  /** Outcome of the last send attempt. */
  sendNotice?: string
}

export function CharacterSheet({
  character,
  onChange,
  portraitEditable = true,
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
      <div className="k-sheet-head">
        <div className="k-sheet-identity">
          <Wordmark />
          <InkField
            label="Jméno"
            value={character.name}
            placeholder="Kdo to je"
            struck={character.dead}
            onChange={(name) => patch({ name })}
          />
          <InkField
            label="Povolání"
            value={character.career}
            placeholder="Čím se živí"
            onChange={(career) => patch({ career })}
          />
          <label className="k-dead-switch">
            <input
              type="checkbox"
              checked={character.dead}
              onChange={(event) => patch({ dead: event.target.checked })}
            />
            Mrtvý
          </label>
        </div>
        <div className="k-sheet-stats">
          <HexField
            label="TZ"
            value={character.armorClass}
            onChange={(armorClass) => patch({ armorClass })}
          />
          <HexField
            label="BZ"
            value={character.armorBonus}
            onChange={(armorBonus) => patch({ armorBonus })}
          />
          <RibbonField
            level={character.level}
            xp={character.xp}
            onLevelChange={(level) => patch({ level })}
            onXpChange={(xp) => patch({ xp })}
          />
        </div>
      </div>

      <div className="k-sheet-body">
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

        <PortraitFrame
          src={character.portrait}
          alt={character.name}
          onUrlChange={
            portraitEditable
              ? (portrait) => patch({ portrait: portrait || undefined })
              : undefined
          }
        />
      </div>

      <div className="k-sheet-slots">
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
          onWoundToggle={(index) => {
            const slots = character.slots.slice()
            slots[index] = { ...slots[index], wound: !slots[index].wound }
            patch({ slots })
          }}
        />

        {sending && (
          <SendPanel
            selectedCount={selected.length}
            targets={sendTargets}
            notice={sendNotice}
            onSend={(targetId) => onSend(targetId, selected)}
          />
        )}
      </div>
    </div>
  )
}
