import { AbilityDial } from './AbilityDial'
import { HealthPennant } from './HealthPennant'
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
}

export function CharacterSheet({ character, onChange }: CharacterSheetProps) {
  const patch = (changes: Partial<Character>) =>
    onChange({ ...character, ...changes })

  return (
    <div className="k-sheet">
      <div className="k-sheet-head">
        <div className="k-sheet-identity">
          <Wordmark />
          <InkField
            label="Jméno"
            value={character.name}
            placeholder="Kdo to je"
            onChange={(name) => patch({ name })}
          />
          <InkField
            label="Povolání"
            value={character.career}
            placeholder="Čím se živí"
            onChange={(career) => patch({ career })}
          />
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
          onSelect={(portrait) => patch({ portrait })}
        />
      </div>

      <div className="k-sheet-slots">
        <SlotList
          slots={character.slots}
          capacity={slotCapacity(character)}
          onSlotChange={(index, value) => {
            const slots = character.slots.slice()
            slots[index] = value
            patch({ slots })
          }}
        />
      </div>
    </div>
  )
}
