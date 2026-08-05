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

type Row = string | { wound: string } | { item: string; note: string }

function rows(items: Row[]) {
  const slots = emptySlots()
  items.forEach((item, index) => {
    if (typeof item === 'string') {
      slots[index] = { text: item, note: '', wound: false }
    } else if ('wound' in item) {
      slots[index] = { text: item.wound, note: '', wound: true }
    } else {
      slots[index] = { text: item.item, note: item.note, wound: false }
    }
  })
  return slots
}

const jarmila: Partial<Character> = {
  name: 'Jarmila Hrdlořezná',
  level: 3,
  xp: 1450,
  shield: 2,
  hp: { current: 5, max: 9 },
  notes: 'Hrobařka. Dluží mi 3 zl.',
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
    { item: 'Lucerna', note: 'Bohušova' },
    'Olej ×2',
    'Lano 15 m',
    'Zásoby ×3',
    'Kožená zbroj',
    'Štít',
    'Dýka',
  ]),
}

const stash: Partial<Character> = {
  kind: 'stash',
  name: 'Předměty',
  notes: 'Kořist z jeskyně, rozdělit po výpravě.',
  slots: rows(['Zlatý pohár', 'Svitek']).slice(0, 6),
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
                { id: 'bohus', name: 'Bohuš', freeRows: 4 },
                { id: 'ondra', name: 'Ondra', freeRows: 9 },
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

/** The sheet at the width of a landscape Owlbear Rodeo popover. */
export const InPopover: Story = {
  render: () => <Harness seed={jarmila} width={760} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Jméno')).toHaveValue(
      'Jarmila Hrdlořezná',
    )
    await expect(canvas.getByLabelText('Brnění')).toHaveValue(2)
    await expect(canvas.getByText('5/9')).toBeVisible()
    // Odolnost 2 → 12 usable rows.
    await expect(canvas.getByText('8/12')).toBeVisible()
  },
}

export const Blank: Story = {
  render: () => <Harness seed={{}} width={760} />,
  play: async ({ canvas }) => {
    // Every bonus starts at +1, so capacity starts at 11.
    await expect(canvas.getByText('0/11')).toBeVisible()
  },
}

/** Obrana follows the bonus and is never typed in. */
export const DefenseFollowsBonus: Story = {
  render: () => <Harness seed={jarmila} width={760} />,
  play: async ({ canvas }) => {
    const sila = canvas.getByLabelText('Síla')
    // Scoped to the Síla dial: other abilities share the same bonus.
    const dial = within(sila.closest('.k-dial') as HTMLElement)
    await expect(dial.getByTitle('Obrana 12')).toBeVisible()
    await userEvent.clear(sila)
    await userEvent.type(sila, '7')
    await expect(dial.getByTitle('Obrana 17')).toBeVisible()
  },
}

/** Bonuses run from +1 to +10, so a bigger number cannot be written. */
export const BonusStopsAtTen: Story = {
  render: () => <Harness seed={jarmila} width={760} />,
  play: async ({ canvas }) => {
    const sila = canvas.getByLabelText('Síla')
    await userEvent.clear(sila)
    await userEvent.type(sila, '14')
    await expect(sila).toHaveValue(10)
  },
}

/** A wound takes an item row and is struck through. */
export const WoundedRow: Story = {
  render: () => <Harness seed={jarmila} width={760} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText('Označit řádek 9 jako zranění'))
    // The wound now occupies a row, so nine of twelve are taken.
    await expect(canvas.getByText('9/12')).toBeVisible()
    await userEvent.type(canvas.getByLabelText('Řádek 9'), 'Zlomená ruka')
    await expect(canvas.getByLabelText('Řádek 9')).toHaveValue('Zlomená ruka')
  },
}

/** The name of a dead character is struck through. */
export const Dead: Story = {
  render: () => <Harness seed={{ ...jarmila, dead: true }} width={760} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Jméno')).toHaveAttribute(
      'data-struck',
      'true',
    )
  },
}

/** Ticking rows enables handing them, notes and all, to another sheet. */
export const SendingItems: Story = {
  render: () => <Harness seed={jarmila} width={760} withSend />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Zaškrtni předměty v seznamu')).toBeVisible()
    await userEvent.click(canvas.getByLabelText('Poslat řádek 1'))
    await userEvent.click(canvas.getByLabelText('Poslat řádek 2'))
    await expect(canvas.getByText('Vybráno 2')).toBeVisible()
    await userEvent.click(canvas.getByRole('radio', { name: /Bohuš/ }))
    await userEvent.click(canvas.getByRole('button', { name: 'Poslat' }))
    await expect(canvas.getByText(/Posláno bohus: 2/)).toBeVisible()
  },
}

/** A GM's loot container: notes, item rows, and sending — nothing else. */
export const GmStash: Story = {
  render: () => <Harness seed={stash} width={520} withSend />,
  play: async ({ canvas }) => {
    await expect(canvas.queryByLabelText('Jméno')).toBeNull()
    await expect(canvas.queryByLabelText('Brnění')).toBeNull()
    await expect(canvas.queryByText('Živ')).toBeNull()
    await expect(canvas.getByText('2/6')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: '+ řádek' }))
    await expect(canvas.getByText('2/7')).toBeVisible()
  },
}

/** Narrow enough that the two halves stack. */
export const Narrow: Story = {
  render: () => <Harness seed={jarmila} width={400} />,
}
