import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { CharacterSheet } from './CharacterSheet'
import { createCharacter, type Character } from './types'

const meta = {
  title: 'Knave/CharacterSheet',
  component: CharacterSheet,
  // Stories drive their own state through Harness; these populate the docs.
  args: {
    character: createCharacter(),
    onChange: () => {},
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CharacterSheet>

export default meta

type Story = StoryObj<typeof meta>

function Harness({
  seed,
  width,
}: {
  seed: Partial<Character>
  width: number
}) {
  const [character, setCharacter] = useState(() => createCharacter(seed))
  return (
    <div style={{ width, margin: '0 auto' }}>
      <CharacterSheet character={character} onChange={setCharacter} />
    </div>
  )
}

const jarmila: Partial<Character> = {
  name: 'Jarmila Hrdlořezná',
  career: 'Hrobařka',
  level: 3,
  xp: 1450,
  armorClass: 13,
  armorBonus: 2,
  hp: { current: 5, max: 9 },
  abilities: {
    sila: 2,
    obratnost: 1,
    odolnost: 2,
    inteligence: 0,
    moudrost: 1,
    charisma: -1,
  },
  slots: [
    'Rýč',
    'Lucerna',
    'Olej ×2',
    'Lano 15 m',
    'Zásoby ×3',
    'Kožená zbroj',
    'Štít',
    'Dýka',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
}

/** The sheet at the size of the Owlbear Rodeo popover. */
export const InPopover: Story = {
  render: () => <Harness seed={jarmila} width={480} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Jméno')).toHaveValue(
      'Jarmila Hrdlořezná',
    )
    await expect(canvas.getByText('5/9')).toBeVisible()
    // Odolnost 2 → 12 usable rows.
    await expect(canvas.getByText('8/12')).toBeVisible()
  },
}

export const Blank: Story = {
  render: () => <Harness seed={{}} width={480} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('0/10')).toBeVisible()
  },
}

/** Raising Odolnost frees up more item rows. */
export const CapacityFollowsOdolnost: Story = {
  render: () => <Harness seed={jarmila} width={480} />,
  play: async ({ canvas }) => {
    const odolnost = canvas.getByLabelText('Odolnost')
    await userEvent.clear(odolnost)
    await userEvent.type(odolnost, '5')
    await expect(canvas.getByText('8/15')).toBeVisible()
  },
}

/** Narrow enough that the sheet folds to a single column. */
export const Narrow: Story = {
  render: () => <Harness seed={jarmila} width={330} />,
}
