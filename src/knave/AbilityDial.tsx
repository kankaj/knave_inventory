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
 * One ability: the full name, then a ring holding the written bonus with the
 * defense set into the top of the ring itself. What the ability is rolled for
 * stays hidden until the dial is hovered or focused, and the tooltip never
 * takes pointer events so it cannot get between a click and the number.
 */
export function AbilityDial({ ability, value, onChange }: AbilityDialProps) {
  const id = useId()
  const tipId = `${id}-uses`
  return (
    <div className="k-dial">
      <label className="k-dial-name" htmlFor={id}>
        {ability.name}
      </label>
      <div className="k-dial-ring">
        <span className="k-dial-def" title={`Obrana ${abilityDefense(value)}`}>
          {abilityDefense(value)}
        </span>
        <span className="k-dial-plus" aria-hidden="true">
          +
        </span>
        <NumberInput
          id={id}
          className="k-dial-value"
          aria-label={ability.name}
          aria-describedby={tipId}
          value={value}
          min={ABILITY_MIN}
          max={ABILITY_MAX}
          onChange={onChange}
        />
      </div>
      <span className="k-dial-uses" id={tipId} role="tooltip">
        {ability.uses}
      </span>
    </div>
  )
}
