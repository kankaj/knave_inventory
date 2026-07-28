export type AbilityKey =
  | 'sila'
  | 'obratnost'
  | 'odolnost'
  | 'inteligence'
  | 'moudrost'
  | 'charisma'

export type Ability = {
  key: AbilityKey
  /** Name as printed on the sheet. */
  name: string
  /** What the ability is rolled for, as printed under the name. */
  uses: string
}

/** The six abilities in sheet order. */
export const ABILITIES: readonly Ability[] = [
  {
    key: 'sila',
    name: 'Síla',
    uses: 'Útoky nablízko, zvedání, šplhání, vyproštění',
  },
  {
    key: 'obratnost',
    name: 'Obratnost',
    uses: 'Uhýbání, plížení, zručnost',
  },
  {
    key: 'odolnost',
    name: 'Odolnost',
    uses: 'Fyzická odolnost, řádky předmětů, zranění',
  },
  {
    key: 'inteligence',
    name: 'Inteligence',
    uses: 'Páčení zámků, alchymie, kouzla za den',
  },
  {
    key: 'moudrost',
    name: 'Moudrost',
    uses: 'Útoky na dálku, shánění potravy, orientace, odolnost proti kouzlům',
  },
  {
    key: 'charisma',
    name: 'Charisma',
    uses: 'Iniciativa, přesvědčování, společníci, požehnání',
  },
]

/** Number of item rows printed on the sheet. */
export const SLOT_COUNT = 20

/** Bonuses are written straight onto the sheet, from +1 to +10. */
export const ABILITY_MIN = 1
export const ABILITY_MAX = 10

/** Defense is never written down, it follows from the bonus. */
export function abilityDefense(bonus: number): number {
  return 10 + bonus
}

/**
 * One item row. A wound occupies a row exactly like a carried item does, so
 * being hurt costs carrying capacity.
 */
export type Slot = {
  text: string
  wound: boolean
}

export function emptySlots(): Slot[] {
  return Array.from({ length: SLOT_COUNT }, () => ({ text: '', wound: false }))
}

/** A row is taken when it holds an item or a wound. */
export function slotTaken(slot: Slot): boolean {
  return slot.wound || slot.text.trim() !== ''
}

export type Character = {
  name: string
  /** POVOLÁNÍ */
  career: string
  /** ÚROVEŇ */
  level: number
  /** ZK */
  xp: number
  /** TZ */
  armorClass: number
  /** BZ */
  armorBonus: number
  /** ŽIV / MAX ŽIV */
  hp: { current: number; max: number }
  abilities: Record<AbilityKey, number>
  /** Always SLOT_COUNT entries, items and wounds alike. */
  slots: Slot[]
  /** Struck through on the sheet, in the tab strip, and in the send-to list. */
  dead: boolean
  /** Image address for PORTRÉT. */
  portrait?: string
}

export function createCharacter(overrides: Partial<Character> = {}): Character {
  return {
    name: '',
    career: '',
    level: 1,
    xp: 0,
    armorClass: 11,
    armorBonus: 0,
    hp: { current: 6, max: 6 },
    abilities: {
      sila: ABILITY_MIN,
      obratnost: ABILITY_MIN,
      odolnost: ABILITY_MIN,
      inteligence: ABILITY_MIN,
      moudrost: ABILITY_MIN,
      charisma: ABILITY_MIN,
    },
    slots: emptySlots(),
    dead: false,
    ...overrides,
  }
}

/**
 * A stored sheet plus who it belongs to. The id is generated once and never
 * changes; Owlbear player ids are per-connection, so keying profiles by them
 * would orphan every sheet the next time the table meets.
 */
export type Profile = {
  id: string
  /** Owlbear player id of the current owner, empty when nobody is claiming. */
  ownerId: string
  /** Last known name of the owner, used to re-find a sheet from a new device. */
  ownerName: string
  character: Character
}

export function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: newProfileId(),
    ownerId: '',
    ownerName: '',
    character: createCharacter({ name: overrides.ownerName ?? '' }),
    ...overrides,
  }
}

function newProfileId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `p${Math.abs(Date.now() ^ (performance.now() * 1000)).toString(36)}`
}

export function normalizeProfile(raw: unknown, fallbackId: string): Profile {
  const input =
    raw && typeof raw === 'object' ? (raw as Partial<Profile>) : undefined
  return {
    id: typeof input?.id === 'string' && input.id ? input.id : fallbackId,
    ownerId: typeof input?.ownerId === 'string' ? input.ownerId : '',
    ownerName: typeof input?.ownerName === 'string' ? input.ownerName : '',
    character: normalizeCharacter(input?.character),
  }
}

/**
 * Rebuild a character from whatever the room metadata holds. Anything shared
 * over the network can be stale, hand-edited, or written by an older version
 * of this extension, and a missing slots array would break rendering.
 */
export function normalizeCharacter(raw: unknown): Character {
  const base = createCharacter()
  if (!raw || typeof raw !== 'object') return base
  const input = raw as Partial<Character>

  const slots: unknown[] = Array.isArray(input.slots) ? input.slots : []
  const abilities = { ...base.abilities }
  if (input.abilities && typeof input.abilities === 'object') {
    for (const key of Object.keys(abilities) as AbilityKey[]) {
      const value = input.abilities[key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        abilities[key] = clamp(value, ABILITY_MIN, ABILITY_MAX)
      }
    }
  }

  const max = number(input.hp?.max, base.hp.max)
  return {
    name: text(input.name),
    career: text(input.career),
    level: number(input.level, base.level),
    xp: number(input.xp, base.xp),
    armorClass: number(input.armorClass, base.armorClass),
    armorBonus: number(input.armorBonus, base.armorBonus),
    hp: { max, current: Math.min(number(input.hp?.current, max), max) },
    abilities,
    slots: Array.from({ length: SLOT_COUNT }, (_, index) =>
      normalizeSlot(slots[index]),
    ),
    dead: input.dead === true,
    portrait: typeof input.portrait === 'string' ? input.portrait : undefined,
  }
}

/** Rows used to be plain strings before wounds existed. */
function normalizeSlot(raw: unknown): Slot {
  if (typeof raw === 'string') return { text: raw, wound: false }
  if (raw && typeof raw === 'object') {
    const slot = raw as Partial<Slot>
    return {
      text: typeof slot.text === 'string' ? slot.text : '',
      wound: slot.wound === true,
    }
  }
  return { text: '', wound: false }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function number(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/**
 * How many item rows the character can actually use. Odolnost is the ability
 * that governs "řádky předmětů" on the sheet, so capacity grows with it.
 * Rows past the capacity are printed but struck through.
 */
export function slotCapacity(character: Character): number {
  const base = 10 + character.abilities.odolnost
  return Math.min(SLOT_COUNT, Math.max(1, base))
}

export function usedSlots(character: Character): number {
  return character.slots.filter(slotTaken).length
}
