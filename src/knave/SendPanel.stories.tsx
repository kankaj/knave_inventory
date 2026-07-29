import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { SendPanel, type SendTarget } from './SendPanel'
import './sheet.css'

// The dead never appear here: they can give things away but cannot take any.
const targets: SendTarget[] = [
  { id: 'bohus', name: 'Bohuš', freeRows: 4 },
  { id: 'ondra', name: 'Ondra', freeRows: 0 },
]

const meta = {
  title: 'Knave/SendPanel',
  component: SendPanel,
  args: {
    selectedCount: 0,
    targets,
    onSend: () => {},
  },
  decorators: [
    (Story) => (
      <div className="k-sheet" style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SendPanel>

export default meta

type Story = StoryObj<typeof meta>

function Harness({ count }: { count: number }) {
  const [notice, setNotice] = useState('')
  return (
    <SendPanel
      selectedCount={count}
      targets={targets}
      notice={notice}
      onSend={(targetId) => setNotice(`Posláno ${targetId}: ${count} ř.`)}
    />
  )
}

export const NothingPicked: Story = {
  render: () => <Harness count={0} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Zaškrtni předměty v seznamu')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Poslat' })).toBeDisabled()
  },
}

/** A recipient must be chosen before anything can be handed over. */
export const NeedsARecipient: Story = {
  render: () => <Harness count={2} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Vybráno 2')).toBeVisible()
    const send = canvas.getByRole('button', { name: 'Poslat' })
    await expect(send).toBeDisabled()
    await userEvent.click(canvas.getByRole('radio', { name: /Bohuš/ }))
    await expect(send).toBeEnabled()
    await userEvent.click(send)
    await expect(canvas.getByText('Posláno bohus: 2 ř.')).toBeVisible()
  },
}

/** Only the living are offered as recipients. */
export const OnlyTheLivingAreListed: Story = {
  render: () => <Harness count={1} />,
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('radio')).toHaveLength(2)
    await expect(canvas.queryByRole('radio', { name: /Květa/ })).toBeNull()
  },
}

export const NobodyToSendTo: Story = {
  args: { targets: [], selectedCount: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Nikdo živý tu nemá list.')).toBeVisible()
  },
}
