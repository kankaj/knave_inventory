import { useId } from 'react'
import { NumberInput } from './fields'
import {
  ABILITY_MAX,
  ABILITY_MIN,
  abilityDefense,
  type Ability,
} from './types'

export type AbilityDialProps = {
  ability: Ability
  value: number
  onChange: (value: number) => void
}

/**
 * One ability: the circled bonus you write down, the defense that follows from
 * it, and what the ability is rolled for. Only the bonus is editable.
 */
export function AbilityDial({ ability, value, onChange }: AbilityDialProps) {
  const id = useId()
  return (
    <div className="k-dial">
      <NumberInput
        id={id}
        className="k-dial-value"
        aria-label={ability.name}
        value={value}
        min={ABILITY_MIN}
        max={ABILITY_MAX}
        onChange={onChange}
      />
      <label className="k-dial-text" htmlFor={id}>
        <span className="k-dial-head">
          <span className="k-dial-name">{ability.name}</span>
          <span className="k-dial-def" title="Obrana">
            obr {abilityDefense(value)}
          </span>
        </span>
        <span className="k-dial-uses">{ability.uses}</span>
      </label>
    </div>
  )
}
