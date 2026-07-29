import { describe, expect, it } from 'vitest'
import {
  ROOM_BUDGET_BYTES,
  jsonBytes,
  packProfile,
  unpackProfile,
} from './codec'
import { createCharacter, createProfile, emptySlots } from './types'

function filled() {
  const slots = emptySlots()
  slots[0] = { text: 'Dlouhý meč', note: 'tupý', wound: false }
  slots[3] = { text: '', note: 'Zlomená ruka', wound: true }
  return createProfile({
    id: 'sheet-1',
    ownerId: 'player-1',
    ownerName: 'Jarmila',
    createdAt: 1000,
    character: createCharacter({
      name: 'Jarmila z Rokle',
      level: 3,
      xp: 120,
      shield: 1,
      hp: { current: 4, max: 9 },
      notes: 'Dluží mi 3 zl.',
      abilities: {
        sila: 3,
        obratnost: 2,
        odolnost: 4,
        inteligence: 1,
        moudrost: 2,
        charisma: 1,
      },
      slots,
      dead: true,
    }),
  })
}

describe('packProfile / unpackProfile', () => {
  it('survives a round trip unchanged', () => {
    const profile = filled()
    expect(unpackProfile(packProfile(profile), 'other-id')).toEqual(profile)
  })

  it('keeps an untouched sheet tiny', () => {
    const profile = createProfile({ id: 'sheet-1', createdAt: 1000 })
    // The plain shape spends most of its bytes on twenty empty item rows.
    expect(jsonBytes(packProfile(profile))).toBeLessThan(jsonBytes(profile) / 5)
  })

  it('fits a whole table inside the room budget', () => {
    const metadata: Record<string, unknown> = {}
    for (let index = 0; index < 8; index += 1) {
      const profile = filled()
      metadata[`key-${index}`] = packProfile({
        ...profile,
        id: `sheet-${index}`,
      })
    }
    expect(jsonBytes(metadata)).toBeLessThan(ROOM_BUDGET_BYTES)
  })

  it('still reads sheets written before packing existed', () => {
    const plain = filled()
    // Older versions stored the profile object as-is, with no version marker.
    const restored = unpackProfile(
      JSON.parse(JSON.stringify(plain)),
      'other-id',
    )
    expect(restored).toEqual(plain)
  })

  it('takes the metadata key as the id when the stored one is gone', () => {
    const packed = packProfile(createProfile({ id: 'sheet-1' }))
    delete packed.i
    expect(unpackProfile(packed, 'key-id').id).toBe('key-id')
  })

  it('ignores rows pointing outside the sheet', () => {
    const packed = packProfile(filled())
    const character = packed.c as Record<string, unknown>
    character.q = [
      [99, 'nikde', '', 0],
      [0, 'meč', '', 0],
    ]
    const restored = unpackProfile(packed, 'sheet-1')
    expect(restored.character.slots[0].text).toBe('meč')
    expect(restored.character.slots).toHaveLength(20)
  })
})
