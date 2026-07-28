import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import App from './App'

const meta = {
  title: 'Extension/App',
  component: App,
} satisfies Meta<typeof App>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Outside of an Owlbear Rodeo room there is no parent window for the SDK to
 * connect to, so `OBR.onReady` never fires and the app stays in its waiting
 * state. This is what Storybook and the test runner always see.
 */
export const Disconnected: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Waiting for Owlbear Rodeo/)).toBeVisible()
  },
}
