import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { CharacterSheet } from './CharacterSheet'
import { createCharacter, emptySlots, type Character } from './types'

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

function rows(items: (string | { wound: string })[]) {
  const slots = emptySlots()
  items.forEach((item, index) => {
    slots[index] =
      typeof item === 'string'
        ? { text: item, wound: false }
        : { text: item.wound, wound: true }
  })
  return slots
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
    inteligence: 1,
    moudrost: 1,
    charisma: 1,
  },
  slots: rows([
    'Rýč',
    'Lucerna',
    'Olej ×2',
    'Lano 15 m',
    'Zásoby ×3',
    'Kožená zbroj',
    'Štít',
    'Dýka',
  ]),
}

function Harness({
  seed,
  width,
  withSend = false,
}: {
  seed: Partial<Character>
  width: number
  withSend?: boolean
}) {
  const [character, setCharacter] = useState(() => createCharacter(seed))
  const [notice, setNotice] = useState('')
  return (
    <div style={{ width, margin: '0 auto' }}>
      <CharacterSheet
        character={character}
        onChange={setCharacter}
        sendNotice={withSend ? notice : undefined}
        sendTargets={
          withSend
            ? [
                { id: 'bohus', name: 'Bohuš', dead: false, freeRows: 4 },
                { id: 'kveta', name: 'Květa', dead: true, freeRows: 0 },
              ]
            : undefined
        }
        onSend={
          withSend
            ? (targetId, indices) =>
                setNotice(`Posláno ${targetId}: ${indices.length} ř.`)
            : undefined
        }
      />
    </div>
  )
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
    // Every bonus starts at +1, so capacity starts at 11.
    await expect(canvas.getByText('0/11')).toBeVisible()
  },
}

/** Obrana follows the bonus and is never typed in. */
export const DefenseFollowsBonus: Story = {
  render: () => <Harness seed={jarmila} width={480} />,
  play: async ({ canvas }) => {
    const sila = canvas.getByLabelText('Síla')
    // Scoped to the Síla row: other abilities share the same bonus.
    const row = within(sila.closest('.k-dial') as HTMLElement)
    await expect(row.getByText('obr 12')).toBeVisible()
    await userEvent.clear(sila)
    await userEvent.type(sila, '7')
    await expect(row.getByText('obr 17')).toBeVisible()
  },
}

/** A wound takes an item row and is struck through. */
export const WoundedRow: Story = {
  render: () => <Harness seed={jarmila} width={480} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText('Označit řádek 9 jako zranění'))
    // The wound now occupies a row, so nine of twelve are taken.
    await expect(canvas.getByText('9/12')).toBeVisible()
    await userEvent.type(canvas.getByLabelText('Řádek 9'), 'Zlomená ruka')
    await expect(canvas.getByLabelText('Řádek 9')).toHaveValue('Zlomená ruka')
  },
}

export const Dead: Story = {
  render: () => <Harness seed={{ ...jarmila, dead: true }} width={480} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Jméno')).toHaveAttribute(
      'data-struck',
      'true',
    )
  },
}

/** Ticking rows enables handing them to another sheet. */
export const SendingItems: Story = {
  render: () => <Harness seed={jarmila} width={480} withSend />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Zaškrtni předměty vlevo')).toBeVisible()
    await userEvent.click(canvas.getByLabelText('Poslat řádek 1'))
    await userEvent.click(canvas.getByLabelText('Poslat řádek 2'))
    await expect(canvas.getByText('Vybráno 2')).toBeVisible()
    // A dead recipient stays listed, struck through.
    const kveta = canvas.getByRole('radio', { name: /Květa/ })
    await expect(kveta).toHaveAttribute('data-dead', 'true')
    await userEvent.click(canvas.getByRole('radio', { name: /Bohuš/ }))
    await userEvent.click(canvas.getByRole('button', { name: 'Poslat' }))
    await expect(canvas.getByText(/Posláno bohus: 2/)).toBeVisible()
  },
}

/** Narrow enough that the sheet folds to a single column. */
export const Narrow: Story = {
  render: () => <Harness seed={jarmila} width={330} />,
}
