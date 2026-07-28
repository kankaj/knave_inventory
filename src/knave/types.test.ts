import { describe, expect, it } from 'vitest'
import {
  SLOT_COUNT,
  createCharacter,
  normalizeCharacter,
  normalizeProfile,
  slotCapacity,
  usedSlots,
} from './types'

describe('normalizeCharacter', () => {
  it('always produces the full set of item rows', () => {
    const character = normalizeCharacter({ slots: ['Meč', 'Štít'] })
    expect(character.slots).toHaveLength(SLOT_COUNT)
    expect(character.slots[0]).toBe('Meč')
    expect(character.slots[19]).toBe('')
  })

  it('survives junk from the room metadata', () => {
    for (const input of [undefined, null, 42, 'sheet', [], {}]) {
      expect(normalizeCharacter(input).slots).toHaveLength(SLOT_COUNT)
    }
  })

  it('drops non-numeric ability values', () => {
    const character = normalizeCharacter({
      abilities: { sila: 3, obratnost: 'dvě', odolnost: Number.NaN },
    })
    expect(character.abilities.sila).toBe(3)
    expect(character.abilities.obratnost).toBe(0)
    expect(character.abilities.odolnost).toBe(0)
  })

  it('never leaves current health above the maximum', () => {
    expect(normalizeCharacter({ hp: { current: 99, max: 6 } }).hp).toEqual({
      current: 6,
      max: 6,
    })
  })

  it('keeps a portrait address but rejects other types', () => {
    expect(
      normalizeCharacter({ portrait: 'https://a.test/x.png' }).portrait,
    ).toBe('https://a.test/x.png')
    expect(normalizeCharacter({ portrait: 12 }).portrait).toBeUndefined()
  })
})

describe('normalizeProfile', () => {
  it('falls back to the metadata key when the stored id is missing', () => {
    const profile = normalizeProfile({ ownerName: 'Jarmila' }, 'key-id')
    expect(profile.id).toBe('key-id')
    expect(profile.ownerId).toBe('')
    expect(profile.ownerName).toBe('Jarmila')
    expect(profile.character.slots).toHaveLength(SLOT_COUNT)
  })

  it('rebuilds a usable profile from nothing', () => {
    expect(normalizeProfile(undefined, 'key-id').id).toBe('key-id')
  })
})

describe('slotCapacity', () => {
  it('grows with odolnost', () => {
    const character = createCharacter()
    expect(slotCapacity(character)).toBe(10)
    character.abilities.odolnost = 3
    expect(slotCapacity(character)).toBe(13)
  })

  it('never exceeds the printed rows or drops below one', () => {
    const strong = createCharacter()
    strong.abilities.odolnost = 50
    expect(slotCapacity(strong)).toBe(SLOT_COUNT)

    const frail = createCharacter()
    frail.abilities.odolnost = -20
    expect(slotCapacity(frail)).toBe(1)
  })
})

describe('usedSlots', () => {
  it('ignores rows holding only whitespace', () => {
    const character = createCharacter()
    character.slots[0] = 'Rýč'
    character.slots[1] = '   '
    expect(usedSlots(character)).toBe(1)
  })
})
