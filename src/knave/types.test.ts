import { describe, expect, it } from 'vitest'
import {
  ABILITY_MAX,
  ABILITY_MIN,
  SLOT_COUNT,
  abilityDefense,
  createCharacter,
  normalizeCharacter,
  normalizeProfile,
  slotCapacity,
  usedSlots,
} from './types'

describe('normalizeCharacter', () => {
  it('migrates the plain string rows written before wounds existed', () => {
    const character = normalizeCharacter({ slots: ['Meč', 'Štít'] })
    expect(character.slots).toHaveLength(SLOT_COUNT)
    expect(character.slots[0]).toEqual({ text: 'Meč', note: '', wound: false })
    expect(character.slots[19]).toEqual({ text: '', note: '', wound: false })
  })

  it('keeps wound rows', () => {
    const character = normalizeCharacter({
      slots: [{ text: 'Zlomená ruka', wound: true }],
    })
    expect(character.slots[0]).toEqual({
      text: 'Zlomená ruka',
      note: '',
      wound: true,
    })
  })

  it('keeps the note written beside a row', () => {
    const character = normalizeCharacter({
      slots: [{ text: 'Lucerna', note: 'půjčená od Bohuše', wound: false }],
    })
    expect(character.slots[0].note).toBe('půjčená od Bohuše')
    // A note of the wrong type must not break the row.
    expect(
      normalizeCharacter({ slots: [{ text: 'Meč', note: 7 }] }).slots[0],
    ).toEqual({ text: 'Meč', note: '', wound: false })
  })

  it('reads the shield from sheets still holding the old armour class', () => {
    expect(normalizeCharacter({ armorClass: 13 }).shield).toBe(13)
    // The shield wins once it has been written.
    expect(normalizeCharacter({ armorClass: 13, shield: 2 }).shield).toBe(2)
    expect(normalizeCharacter({}).shield).toBe(0)
  })

  it('defaults dead to false and only trusts a real true', () => {
    expect(normalizeCharacter({}).dead).toBe(false)
    expect(normalizeCharacter({ dead: 'ano' }).dead).toBe(false)
    expect(normalizeCharacter({ dead: true }).dead).toBe(true)
  })

  it('clamps ability bonuses to the writable range', () => {
    expect(normalizeCharacter({ abilities: { sila: 99 } }).abilities.sila).toBe(
      ABILITY_MAX,
    )
    expect(normalizeCharacter({ abilities: { sila: -4 } }).abilities.sila).toBe(
      ABILITY_MIN,
    )
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
    expect(character.abilities.obratnost).toBe(ABILITY_MIN)
    expect(character.abilities.odolnost).toBe(ABILITY_MIN)
  })

  it('never leaves current health above the maximum', () => {
    expect(normalizeCharacter({ hp: { current: 99, max: 6 } }).hp).toEqual({
      current: 6,
      max: 6,
    })
  })

  it('keeps the free-form notes but rejects other types', () => {
    expect(normalizeCharacter({ notes: 'Dluží mi 3 zl.' }).notes).toBe(
      'Dluží mi 3 zl.',
    )
    expect(normalizeCharacter({ notes: 12 }).notes).toBe('')
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

describe('abilityDefense', () => {
  it('is ten plus the written bonus', () => {
    expect(abilityDefense(1)).toBe(11)
    expect(abilityDefense(10)).toBe(20)
  })
})

describe('slotCapacity', () => {
  it('grows with odolnost', () => {
    const character = createCharacter()
    expect(slotCapacity(character)).toBe(11)
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
    character.slots[0] = { text: 'Rýč', note: '', wound: false }
    character.slots[1] = { text: '   ', note: '', wound: false }
    expect(usedSlots(character)).toBe(1)
  })

  it('counts a wound row even when it has no text yet', () => {
    const character = createCharacter()
    character.slots[0] = { text: '', note: '', wound: true }
    expect(usedSlots(character)).toBe(1)
  })

  it('ignores a row that holds only a note', () => {
    const character = createCharacter()
    character.slots[0] = { text: '', note: 'na co to bylo?', wound: false }
    expect(usedSlots(character)).toBe(0)
  })
})
