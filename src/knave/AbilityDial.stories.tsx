import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { AbilityDial } from './AbilityDial'
import { ABILITIES } from './types'
import './sheet.css'

const meta = {
  title: 'Knave/AbilityDial',
  component: AbilityDial,
  args: {
    ability: ABILITIES[0],
    value: 0,
    onChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="k-sheet" style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AbilityDial>

export default meta

type Story = StoryObj<typeof meta>

function SingleHarness() {
  const [value, setValue] = useState(2)
  return (
    <AbilityDial ability={ABILITIES[0]} value={value} onChange={setValue} />
  )
}

function AllSixHarness() {
  const [values, setValues] = useState(() => [1, 4, 3, 2, 6, 10])
  return (
    <div className="k-dials">
      {ABILITIES.map((ability, index) => (
        <AbilityDial
          key={ability.key}
          ability={ability}
          value={values[index]}
          onChange={(next) =>
            setValues(values.map((v, i) => (i === index ? next : v)))
          }
        />
      ))}
    </div>
  )
}

export const Single: Story = {
  render: () => <SingleHarness />,
  play: async ({ canvas }) => {
    const dial = canvas.getByLabelText('Síla')
    await userEvent.clear(dial)
    await userEvent.type(dial, '4')
    await expect(dial).toHaveValue(4)
  },
}

export const AllSix: Story = {
  render: () => <AllSixHarness />,
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Charisma')).toHaveValue(10)
    // Obrana is ten plus the bonus, set into the ring but never typed.
    await expect(canvas.getByTitle('Obrana 20')).toBeVisible()
  },
}

/** The description is hidden until hover, and never blocks the field. */
export const UsesOnHover: Story = {
  render: () => <SingleHarness />,
  play: async ({ canvas }) => {
    const tip = canvas.getByRole('tooltip')
    await expect(tip).toHaveTextContent('Útoky nablízko')
    await expect(tip).toHaveStyle({ pointerEvents: 'none' })
  },
}

/** Bonuses only go from +1 to +10, so typing past that is clamped. */
export const ClampedToWritableRange: Story = {
  render: () => <SingleHarness />,
  play: async ({ canvas }) => {
    const dial = canvas.getByLabelText('Síla')
    await userEvent.clear(dial)
    await userEvent.type(dial, '40')
    await expect(dial).toHaveValue(10)
  },
}
