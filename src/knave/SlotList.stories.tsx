import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { SlotList } from './SlotList'
import { emptySlots, type Slot } from './types'
import './sheet.css'

const meta = {
  title: 'Knave/SlotList',
  component: SlotList,
  // Stories drive their own state through Harness; these keep the docs page
  // and the arg table populated.
  args: {
    slots: emptySlots(),
    capacity: 11,
    onSlotChange: () => {},
    onWoundToggle: () => {},
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

function fill(items: (string | { wound: string })[]): Slot[] {
  const slots = emptySlots()
  items.forEach((item, index) => {
    slots[index] =
      typeof item === 'string'
        ? { text: item, wound: false }
        : { text: item.wound, wound: true }
  })
  return slots
}

function Harness({
  items,
  capacity,
  picking = false,
}: {
  items: (string | { wound: string })[]
  capacity: number
  picking?: boolean
}) {
  const [slots, setSlots] = useState(() => fill(items))
  const [selected, setSelected] = useState<number[]>([])

  return (
    <SlotList
      slots={slots}
      capacity={capacity}
      selected={picking ? selected : undefined}
      onSelectToggle={
        picking
          ? (index) =>
              setSelected((current) =>
                current.includes(index)
                  ? current.filter((item) => item !== index)
                  : [...current, index],
              )
          : undefined
      }
      onSlotChange={(index, text) =>
        setSlots(
          slots.map((slot, i) => (i === index ? { ...slot, text } : slot)),
        )
      }
      onWoundToggle={(index) =>
        setSlots(
          slots.map((slot, i) =>
            i === index ? { ...slot, wound: !slot.wound } : slot,
          ),
        )
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

/** Wounds cost capacity exactly like carried gear. */
export const Wounded: Story = {
  render: () => (
    <Harness
      items={['Meč', { wound: 'Zlomená ruka' }, { wound: 'Popálení' }]}
      capacity={12}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('3/12')).toBeVisible()
    await expect(
      canvas.getByLabelText('Zrušit zranění na řádku 2'),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

/** Marking a row as a wound eats a row that was free a moment ago. */
export const MarkAWound: Story = {
  render: () => <Harness items={['Meč']} capacity={12} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('1/12')).toBeVisible()
    await userEvent.click(canvas.getByLabelText('Označit řádek 5 jako zranění'))
    await expect(canvas.getByText('2/12')).toBeVisible()
  },
}

/** Only rows holding an item can be ticked for sending. */
export const PickingItemsToSend: Story = {
  render: () => (
    <Harness items={['Meč', { wound: 'Popálení' }]} capacity={12} picking />
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText('Poslat řádek 1'))
    await expect(canvas.getByLabelText('Poslat řádek 1')).toBeChecked()
    // A wound cannot be handed over, and an empty row has nothing to give.
    await expect(canvas.getByLabelText('Poslat řádek 2')).toBeDisabled()
    await expect(canvas.getByLabelText('Poslat řádek 3')).toBeDisabled()
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
