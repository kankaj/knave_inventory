import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { SlotList } from './SlotList'
import { SLOT_COUNT } from './types'
import './sheet.css'

const meta = {
  title: 'Knave/SlotList',
  component: SlotList,
  // Stories drive their own state through Harness; these keep the docs page
  // and the arg table populated.
  args: {
    slots: Array.from({ length: SLOT_COUNT }, () => ''),
    capacity: 10,
    onSlotChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="k-sheet" style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SlotList>

export default meta

type Story = StoryObj<typeof meta>

function fill(items: string[]): string[] {
  const slots = Array.from({ length: SLOT_COUNT }, () => '')
  items.forEach((item, index) => {
    slots[index] = item
  })
  return slots
}

function Harness({ items, capacity }: { items: string[]; capacity: number }) {
  const [slots, setSlots] = useState(() => fill(items))
  return (
    <SlotList
      slots={slots}
      capacity={capacity}
      onSlotChange={(index, value) =>
        setSlots(slots.map((slot, i) => (i === index ? value : slot)))
      }
    />
  )
}

export const Empty: Story = {
  render: () => <Harness items={[]} capacity={12} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('0/12')).toBeVisible()
  },
}

export const Packed: Story = {
  render: () => (
    <Harness
      items={[
        'Meč',
        'Štít',
        'Kožená zbroj',
        'Lucerna',
        'Olej',
        'Lano 15 m',
        'Zásoby',
        'Zásoby',
        'Páčidlo',
        'Kostky',
      ]}
      capacity={12}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('10/12')).toBeVisible()
    await userEvent.type(canvas.getByLabelText('Řádek 11'), 'Pochodeň')
    await expect(canvas.getByText('11/12')).toBeVisible()
  },
}

/** Rows past capacity stay printed but struck through, as on paper. */
export const Overloaded: Story = {
  render: () => (
    <Harness
      items={Array.from({ length: 14 }, (_, i) => `Kámen ${i + 1}`)}
      capacity={11}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Přetížen 14/11')).toBeVisible()
    await expect(canvas.getByLabelText('Řádek 12 (nad kapacitu)')).toBeVisible()
  },
}
