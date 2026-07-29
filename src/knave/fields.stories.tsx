import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { NameMark, NotesField, RibbonField, ShieldField } from './fields'
import './sheet.css'

const meta = {
  title: 'Knave/Fields',
  decorators: [
    (Story) => (
      <div className="k-sheet" style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

function NameHarness({ struck = false }: { struck?: boolean }) {
  const [value, setValue] = useState('')
  return <NameMark value={value} struck={struck} onChange={setValue} />
}

function ShieldHarness() {
  const [shield, setShield] = useState(2)
  return <ShieldField label="Brnění" value={shield} onChange={setShield} />
}

function RibbonHarness() {
  const [level, setLevel] = useState(3)
  const [xp, setXp] = useState(1450)
  return (
    <RibbonField
      level={level}
      xp={xp}
      onLevelChange={setLevel}
      onXpChange={setXp}
    />
  )
}

function NotesHarness() {
  const [notes, setNotes] = useState('')
  return <NotesField value={notes} onChange={setNotes} />
}

/** The name is written in the blackletter face the logo used to use. */
export const Name: Story = {
  render: () => <NameHarness />,
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Jméno')
    await userEvent.type(input, 'Jarmila Hrdlořezná')
    await expect(input).toHaveValue('Jarmila Hrdlořezná')
  },
}

export const NameOfTheDead: Story = {
  render: () => <NameHarness struck />,
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Jméno')).toHaveAttribute(
      'data-struck',
      'true',
    )
  },
}

/** Only numbers go in the shield. */
export const Shield: Story = {
  render: () => <ShieldHarness />,
  play: async ({ canvas }) => {
    const shield = canvas.getByLabelText('Brnění')
    await expect(shield).toHaveAttribute('type', 'number')
    // Clear and retype must replace, not append.
    await userEvent.clear(shield)
    await userEvent.type(shield, '4')
    await expect(shield).toHaveValue(4)
  },
}

export const Ribbon: Story = {
  render: () => <RibbonHarness />,
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('ZK')).toHaveValue(1450)
  },
}

export const Notes: Story = {
  render: () => <NotesHarness />,
  play: async ({ canvas }) => {
    const notes = canvas.getByLabelText('Poznámky')
    await userEvent.type(notes, 'Dluží mi 3 zl.')
    await expect(notes).toHaveValue('Dluží mi 3 zl.')
  },
}
