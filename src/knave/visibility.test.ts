import { describe, expect, it } from 'vitest'
import { isVisibleToViewer } from './visibility'
import { createProfile } from './types'

describe('isVisibleToViewer', () => {
  it('hides a hidden profile from a player', () => {
    const profile = createProfile({ hidden: true })
    expect(isVisibleToViewer(profile, false)).toBe(false)
  })

  it('still shows a hidden profile to the GM', () => {
    const profile = createProfile({ hidden: true })
    expect(isVisibleToViewer(profile, true)).toBe(true)
  })

  it('shows a visible profile to everyone', () => {
    const profile = createProfile({ hidden: false })
    expect(isVisibleToViewer(profile, false)).toBe(true)
    expect(isVisibleToViewer(profile, true)).toBe(true)
  })
})
