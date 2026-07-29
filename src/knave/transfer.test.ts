import { describe, expect, it } from 'vitest'
import { freeRows, sendItems } from './transfer'
import { createCharacter, type Character } from './types'

type Row = string | { wound: string } | { item: string; note: string }

function sheet(rows: Row[], odolnost = 1): Character {
  const character = createCharacter()
  character.abilities.odolnost = odolnost
  rows.forEach((row, index) => {
    if (typeof row === 'string') {
      character.slots[index] = { text: row, note: '', wound: false }
    } else if ('wound' in row) {
      character.slots[index] = { text: row.wound, note: '', wound: true }
    } else {
      character.slots[index] = { text: row.item, note: row.note, wound: false }
    }
  })
  return character
}

function texts(character: Character): string[] {
  return character.slots.filter((slot) => slot.text !== '').map((s) => s.text)
}

describe('freeRows', () => {
  it('counts only usable rows', () => {
    // Odolnost 1 -> capacity 11, two rows taken.
    expect(freeRows(sheet(['Meč', 'Štít']))).toBe(9)
  })

  it('treats wounds as occupied', () => {
    expect(freeRows(sheet(['Meč', { wound: 'Zlomená ruka' }]))).toBe(9)
  })
})

describe('sendItems', () => {
  it('moves several items at once', () => {
    const from = sheet(['Meč', 'Štít', 'Lucerna'])
    const to = sheet([])

    const result = sendItems(from, to, [0, 2])
    if (!result.ok) throw new Error('expected the send to succeed')

    expect(result.moved).toEqual(['Meč', 'Lucerna'])
    expect(texts(result.from)).toEqual(['Štít'])
    expect(texts(result.to)).toEqual(['Meč', 'Lucerna'])
  })

  it('fills the recipient from the first open row', () => {
    const from = sheet(['Olej'])
    const to = sheet(['Meč', '', 'Štít'])

    const result = sendItems(from, to, [0])
    if (!result.ok) throw new Error('expected the send to succeed')

    expect(result.to.slots[1]).toEqual({
      text: 'Olej',
      note: '',
      wound: false,
    })
  })

  it('hands the note over with the item and leaves neither behind', () => {
    const from = sheet([{ item: 'Lucerna', note: 'Bohušova' }])
    const to = sheet([])

    const result = sendItems(from, to, [0])
    if (!result.ok) throw new Error('expected the send to succeed')

    expect(result.to.slots[0]).toEqual({
      text: 'Lucerna',
      note: 'Bohušova',
      wound: false,
    })
    expect(result.from.slots[0]).toEqual({ text: '', note: '', wound: false })
  })

  it('refuses a dead recipient, who can only give things away', () => {
    const from = sheet(['Meč'])
    const to = sheet([])
    to.dead = true

    expect(sendItems(from, to, [0])).toEqual({
      ok: false,
      reason: 'recipient-dead',
      free: 11,
      needed: 1,
    })
  })

  it('refuses when the recipient has too few rows', () => {
    const from = sheet(['Meč', 'Štít'])
    // Capacity 11 with ten items already carried leaves one row.
    const to = sheet(Array.from({ length: 10 }, (_, i) => `Kámen ${i + 1}`))

    const result = sendItems(from, to, [0, 1])
    expect(result).toEqual({ ok: false, reason: 'no-room', free: 1, needed: 2 })
  })

  it('leaves both sheets untouched when it refuses', () => {
    const from = sheet(['Meč'])
    const to = sheet(Array.from({ length: 11 }, () => 'Kámen'))

    const result = sendItems(from, to, [0])
    expect(result.ok).toBe(false)
    expect(texts(from)).toEqual(['Meč'])
  })

  it('never sends a wound', () => {
    const from = sheet([{ wound: 'Zlomená ruka' }])
    const to = sheet([])

    expect(sendItems(from, to, [0])).toEqual({
      ok: false,
      reason: 'no-selection',
      free: 11,
      needed: 0,
    })
  })

  it('ignores empty rows and duplicate selections', () => {
    const from = sheet(['Meč', ''])
    const to = sheet([])

    const result = sendItems(from, to, [0, 0, 1, 99])
    if (!result.ok) throw new Error('expected the send to succeed')

    expect(result.moved).toEqual(['Meč'])
  })

  it('reports an empty selection instead of writing nothing', () => {
    const result = sendItems(sheet(['Meč']), sheet([]), [])
    expect(result).toEqual({
      ok: false,
      reason: 'no-selection',
      free: 11,
      needed: 0,
    })
  })

  it('respects a shrunken capacity from low odolnost', () => {
    const from = sheet(['Meč'])
    // Odolnost -20 clamps capacity to 1, and that row is filled.
    const to = sheet(['Náklad'], -20)

    const result = sendItems(from, to, [0])
    expect(result).toEqual({ ok: false, reason: 'no-room', free: 0, needed: 1 })
  })
})
