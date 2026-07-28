import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import {
  HexField,
  InkField,
  PortraitFrame,
  RibbonField,
  Wordmark,
} from './fields'
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

function InkFieldHarness() {
  const [value, setValue] = useState('')
  return (
    <InkField
      label="Jméno"
      value={value}
      placeholder="Kdo to je"
      onChange={setValue}
    />
  )
}

function HexHarness() {
  const [tz, setTz] = useState(13)
  const [bz, setBz] = useState(2)
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <HexField label="TZ" value={tz} onChange={setTz} />
      <HexField label="BZ" value={bz} onChange={setBz} />
    </div>
  )
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

export const Wordmarks: Story = {
  render: () => <Wordmark />,
}

export const WritingLine: Story = {
  render: () => <InkFieldHarness />,
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Jméno')
    await userEvent.type(input, 'Jarmila Hrdlořezná')
    await expect(input).toHaveValue('Jarmila Hrdlořezná')
  },
}

export const Hexes: Story = {
  render: () => <HexHarness />,
  play: async ({ canvas }) => {
    const tz = canvas.getByLabelText('TZ')
    await expect(tz).toHaveValue(13)
    // Clear and retype must replace, not append.
    await userEvent.clear(tz)
    await userEvent.type(tz, '16')
    await expect(tz).toHaveValue(16)
  },
}

export const Ribbon: Story = {
  render: () => <RibbonHarness />,
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('ZK')).toHaveValue(1450)
  },
}

function PortraitHarness() {
  const [url, setUrl] = useState('')
  return <PortraitFrame src={url} onUrlChange={setUrl} />
}

export const PortraitEmpty: Story = {
  render: () => <PortraitHarness />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Vlož odkaz na obrázek')).toBeVisible()
    const field = canvas.getByLabelText('Odkaz na portrét')
    await userEvent.type(field, 'https://example.test/jarmila.png')
    await expect(field).toHaveValue('https://example.test/jarmila.png')
  },
}

export const PortraitReadOnly: Story = {
  render: () => <PortraitFrame />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Bez portrétu')).toBeVisible()
  },
}
