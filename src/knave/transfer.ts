import { slotCapacity, slotTaken, type Character } from './types'

export type SendFailure = {
  ok: false
  reason: 'no-selection' | 'no-room'
  /** Rows the recipient has available. */
  free: number
  /** Rows the shipment needs. */
  needed: number
}

export type SendSuccess = {
  ok: true
  from: Character
  to: Character
  /** Names of the items that changed hands, in row order. */
  moved: string[]
}

export type SendResult = SendSuccess | SendFailure

/** Usable rows the character has not filled with an item or a wound. */
export function freeRows(character: Character): number {
  const capacity = slotCapacity(character)
  return character.slots.filter(
    (slot, index) => index < capacity && !slotTaken(slot),
  ).length
}

/**
 * Hand items from one sheet to another. Wounds stay put — they are not
 * luggage. The send is refused outright when the recipient lacks rows, so
 * nothing is silently dropped or quietly pushed over capacity.
 */
export function sendItems(
  from: Character,
  to: Character,
  indices: readonly number[],
): SendResult {
  const sending = [...new Set(indices)]
    .filter((index) => index >= 0 && index < from.slots.length)
    .filter((index) => {
      const slot = from.slots[index]
      return !slot.wound && slot.text.trim() !== ''
    })
    .sort((a, b) => a - b)

  const capacity = slotCapacity(to)
  const openRows = to.slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot, index }) => index < capacity && !slotTaken(slot))
    .map(({ index }) => index)

  if (sending.length === 0) {
    return {
      ok: false,
      reason: 'no-selection',
      free: openRows.length,
      needed: 0,
    }
  }

  if (openRows.length < sending.length) {
    return {
      ok: false,
      reason: 'no-room',
      free: openRows.length,
      needed: sending.length,
    }
  }

  const nextFrom = from.slots.slice()
  const nextTo = to.slots.slice()
  const moved: string[] = []

  sending.forEach((fromIndex, position) => {
    const slot = nextFrom[fromIndex]
    moved.push(slot.text)
    nextTo[openRows[position]] = { text: slot.text, wound: false }
    nextFrom[fromIndex] = { text: '', wound: false }
  })

  return {
    ok: true,
    from: { ...from, slots: nextFrom },
    to: { ...to, slots: nextTo },
    moved,
  }
}
