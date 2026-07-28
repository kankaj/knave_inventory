import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { ProfileTabs } from './ProfileTabs'
import type { ProfileEntry } from './storage'
import { createProfile } from './types'
import './sheet.css'

function entry(
  name: string,
  options: Partial<Omit<ProfileEntry, 'profile' | 'displayName'>> = {},
): ProfileEntry {
  return {
    profile: createProfile({ id: name.toLowerCase(), ownerName: name }),
    displayName: name,
    color: '#8a8178',
    connected: true,
    isSelf: false,
    ...options,
  }
}

const room: ProfileEntry[] = [
  entry('Jarmila', { color: '#c14b3a', isSelf: true }),
  entry('Bohuš', { color: '#3a6ec1' }),
  entry('Ondra', { color: '#3ac18a' }),
  entry('Květa', { connected: false }),
]

const meta = {
  title: 'Knave/ProfileTabs',
  component: ProfileTabs,
  args: {
    entries: room,
    activeId: 'jarmila',
    onSelect: () => {},
    onAdd: () => {},
  },
  decorators: [
    (Story) => (
      <div className="k-sheet" style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileTabs>

export default meta

type Story = StoryObj<typeof meta>

function Harness() {
  const [activeId, setActiveId] = useState('jarmila')
  return (
    <ProfileTabs
      entries={room}
      activeId={activeId}
      onSelect={setActiveId}
      onAdd={() => {}}
    />
  )
}

export const Room: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('tab', { name: /Jarmila/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // A sheet whose owner left the room stays available.
    await expect(canvas.getByRole('tab', { name: /Květa/ })).toBeVisible()
  },
}

/** Anyone in the room can open anyone else's sheet. */
export const SwitchToAnotherPlayer: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    const other = canvas.getByRole('tab', { name: /Bohuš/ })
    await userEvent.click(other)
    await expect(other).toHaveAttribute('aria-selected', 'true')
    await expect(canvas.getByRole('tab', { name: /Jarmila/ })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  },
}
