import {
  ABILITIES,
  SLOT_COUNT,
  STASH_DEFAULT_ROWS,
  createCharacter,
  emptySlot,
  normalizeProfile,
  type AbilityKey,
  type Character,
  type CharacterKind,
  type Profile,
  type Slot,
} from './types'

/**
 * Room metadata is capped at 16 kB for the *whole room*, shared with every
 * other extension the table uses. A sheet stored as plain JSON spends around a
 * kilobyte on twenty `{"text":"","note":"","wound":false}` rows that hold
 * nothing, so a full party ran into the cap and further writes were rejected —
 * which is how sheets lost what had been typed into them.
 *
 * The packed form uses single-letter keys, drops every value that equals the
 * default, and stores only the item rows actually in use. An empty sheet packs
 * to well under a tenth of its plain size.
 */
export const PACK_VERSION = 2

/** Total room metadata we are willing to occupy, leaving room for others. */
export const ROOM_BUDGET_BYTES = 14_000

const ABILITY_ORDER: readonly AbilityKey[] = ABILITIES.map(
  (ability) => ability.key,
)

/** `[row index, text, note, wound]` — only rows that hold something. */
type PackedSlot = [number, string, string, 0 | 1]

type Packed = Record<string, unknown>

export function packProfile(profile: Profile): Packed {
  const packed: Packed = { v: PACK_VERSION, i: profile.id }
  if (profile.ownerId) packed.o = profile.ownerId
  if (profile.ownerName) packed.n = profile.ownerName
  if (profile.createdAt) packed.t = profile.createdAt
  if (profile.hidden) packed.h = 1
  const character = packCharacter(profile.character)
  if (Object.keys(character).length > 0) packed.c = character
  return packed
}

function packCharacter(character: Character): Packed {
  const base = createCharacter()
  const packed: Packed = {}
  if (character.kind !== base.kind) packed.k = character.kind
  if (character.name) packed.n = character.name
  if (character.level !== base.level) packed.l = character.level
  if (character.xp !== base.xp) packed.x = character.xp
  if (character.shield !== base.shield) packed.s = character.shield
  if (
    character.hp.current !== base.hp.current ||
    character.hp.max !== base.hp.max
  ) {
    packed.h = [character.hp.current, character.hp.max]
  }
  if (character.notes) packed.m = character.notes
  const abilitiesDiffer = ABILITY_ORDER.some(
    (key) => character.abilities[key] !== base.abilities[key],
  )
  if (abilitiesDiffer) {
    packed.a = ABILITY_ORDER.map((key) => character.abilities[key])
  }
  if (character.dead) packed.d = 1

  const slots: PackedSlot[] = []
  character.slots.forEach((slot, index) => {
    if (!slot.text && !slot.note && !slot.wound) return
    slots.push([index, slot.text, slot.note, slot.wound ? 1 : 0])
  })
  if (slots.length > 0) packed.q = slots
  // A stash's row count is meaningful even when every row is empty, unlike a
  // character's fixed 20 — so it has to be stored explicitly.
  if (character.kind === 'stash') packed.qn = character.slots.length

  return packed
}

/**
 * Read a sheet back. Anything not in the packed shape — including sheets
 * written by an older version of this extension — falls through to the plain
 * normaliser, so upgrading never drops a table's data.
 */
export function unpackProfile(raw: unknown, fallbackId: string): Profile {
  if (!raw || typeof raw !== 'object') return normalizeProfile(raw, fallbackId)
  const input = raw as Packed
  if (input.v !== PACK_VERSION) return normalizeProfile(raw, fallbackId)

  return {
    id: string(input.i) || fallbackId,
    ownerId: string(input.o),
    ownerName: string(input.n),
    createdAt: number(input.t, 0),
    hidden: input.h === 1 || input.h === true,
    character: unpackCharacter(input.c),
  }
}

function unpackCharacter(raw: unknown): Character {
  const base = createCharacter()
  if (!raw || typeof raw !== 'object') return base
  const input = raw as Packed

  const kind: CharacterKind = input.k === 'stash' ? 'stash' : 'character'

  const abilities = { ...base.abilities }
  if (Array.isArray(input.a)) {
    const values = input.a as unknown[]
    ABILITY_ORDER.forEach((key, index) => {
      const value = values[index]
      if (typeof value === 'number' && Number.isFinite(value)) {
        abilities[key] = value
      }
    })
  }

  const hp = Array.isArray(input.h) ? (input.h as unknown[]) : []
  const max = number(hp[1], base.hp.max)

  // A character always has SLOT_COUNT rows; a stash has whatever row count
  // was saved (meaningful even when every row is empty), or a fresh default.
  const length =
    kind === 'stash' ? positiveInt(input.qn, STASH_DEFAULT_ROWS) : SLOT_COUNT
  const slots = unpackSlots(length, input.q)

  return {
    kind,
    name: string(input.n),
    level: number(input.l, base.level),
    xp: number(input.x, base.xp),
    shield: number(input.s, base.shield),
    hp: { max, current: Math.min(number(hp[0], max), max) },
    notes: string(input.m),
    abilities,
    slots,
    dead: input.d === 1 || input.d === true,
  }
}

function unpackSlots(length: number, packedSlots: unknown): Slot[] {
  const slots: Slot[] = Array.from({ length }, emptySlot)
  if (!Array.isArray(packedSlots)) return slots
  for (const entry of packedSlots as unknown[]) {
    if (!Array.isArray(entry)) continue
    const [index, text, note, wound] = entry as unknown[]
    if (typeof index !== 'number') continue
    if (index < 0 || index >= length) continue
    slots[index] = {
      text: string(text),
      note: string(note),
      wound: wound === 1 || wound === true,
    }
  }
  return slots
}

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : fallback
}

/** Byte length the value takes up in room metadata. */
export function jsonBytes(value: unknown): number {
  const text = JSON.stringify(value) ?? ''
  if (typeof TextEncoder === 'undefined') return text.length
  return new TextEncoder().encode(text).length
}

function string(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function number(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
