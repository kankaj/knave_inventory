import { useId } from 'react'
import { NumberInput } from './fields'
import type { Ability } from './types'

export type AbilityDialProps = {
  ability: Ability
  value: number
  onChange: (value: number) => void
}

/** One ability: a circled bonus, its name, and what it is rolled for. */
export function AbilityDial({ ability, value, onChange }: AbilityDialProps) {
  const id = useId()
  return (
    <div className="k-dial">
      <NumberInput
        id={id}
        className="k-dial-value"
        aria-label={ability.name}
        value={value}
        onChange={onChange}
      />
      <label className="k-dial-text" htmlFor={id}>
        <span className="k-dial-name">{ability.name}</span>
        <span className="k-dial-uses">{ability.uses}</span>
      </label>
    </div>
  )
}
