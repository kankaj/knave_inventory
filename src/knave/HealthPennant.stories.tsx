import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { HealthPennant } from './HealthPennant'
import './sheet.css'

const meta = {
  title: 'Knave/HealthPennant',
  component: HealthPennant,
  // Stories drive their own state through Harness; these populate the docs.
  args: {
    current: 8,
    max: 8,
    onCurrentChange: () => {},
    onMaxChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="k-sheet" style={{ height: 320, display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HealthPennant>

export default meta

type Story = StoryObj<typeof meta>

function Harness({ start, max }: { start: number; max: number }) {
  const [current, setCurrent] = useState(start)
  const [total, setTotal] = useState(max)
  return (
    <HealthPennant
      current={current}
      max={total}
      onCurrentChange={setCurrent}
      onMaxChange={setTotal}
    />
  )
}

export const Full: Story = {
  render: () => <Harness start={8} max={8} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Živ')).toHaveValue(8)
  },
}

/** Clicking a pip sets health to that value — one click for any damage. */
export const TakeDamage: Story = {
  render: () => <Harness start={8} max={8} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText('Nastavit životy na 5'))
    await expect(canvas.getByLabelText('Živ')).toHaveValue(5)
  },
}

/** Clicking the lowest filled pip empties the track, so 1 → 0 stays one click. */
export const DownToNothing: Story = {
  render: () => <Harness start={1} max={8} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText('Nastavit životy na 1'))
    await expect(canvas.getByLabelText('Živ')).toHaveValue(0)
  },
}

export const Bloodied: Story = {
  render: () => <Harness start={2} max={12} />,
}
