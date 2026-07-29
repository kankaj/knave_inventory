import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { compareProfiles } from './ordering'
import { ProfileSidebar } from './ProfileSidebar'
import type { ProfileEntry } from './storage'
import { createCharacter, createProfile } from './types'
import './sheet.css'

function entry(
  name: string,
  owner: string,
  createdAt: number,
  options: Partial<Omit<ProfileEntry, 'profile' | 'displayName'>> = {},
): ProfileEntry {
  return {
    profile: createProfile({
      id: name.toLowerCase(),
      ownerName: owner,
      createdAt,
      character: createCharacter({ name }),
    }),
    displayName: name,
    color: '#8a8178',
    connected: true,
    isSelf: false,
    ...options,
  }
}

// The app hands the column an already ordered list, so the stories sort too.
const room: ProfileEntry[] = [
  entry('Jarmila', 'Jarmila', 1000, { color: '#c14b3a', isSelf: true }),
  entry('Věštkyně', 'Jarmila', 4000, { color: '#c14b3a', isSelf: true }),
  entry('Bohuš', 'Bohuš', 2000, { color: '#3a6ec1' }),
  entry('Květa', 'Květa', 3000, { connected: false }),
  entry('Nalezenec', '', 5000, { connected: false }),
].sort(compareProfiles)

const meta = {
  title: 'Knave/ProfileSidebar',
  component: ProfileSidebar,
  args: {
    entries: room,
    activeId: 'jarmila',
    onSelect: () => {},
    onAdd: () => {},
    onExport: () => {},
    onImport: () => {},
  },
  decorators: [
    (Story) => (
      <div className="k-sheet" style={{ width: 200, height: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileSidebar>

export default meta

type Story = StoryObj<typeof meta>

function Harness() {
  const [activeId, setActiveId] = useState('jarmila')
  return (
    <ProfileSidebar
      entries={room}
      activeId={activeId}
      onSelect={setActiveId}
      onAdd={() => {}}
      onExport={() => {}}
      onImport={() => {}}
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
    // Owner groups, and inside a group the oldest sheet first.
    const names = canvas
      .getAllByRole('tab')
      .map((tab) => tab.textContent?.replace(/ty|pryč/g, '').trim())
    await expect(names).toEqual([
      'Bohuš',
      'Jarmila',
      'Věštkyně',
      'Květa',
      'Nalezenec',
    ])
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

/** The room can be carried out to a file and back in again. */
export const Backup: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Stáhnout zálohu' }),
    ).toBeVisible()
    await expect(canvas.getByText('Načíst zálohu')).toBeVisible()
  },
}
