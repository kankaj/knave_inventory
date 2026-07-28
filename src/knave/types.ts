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
  /** Always SLOT_COUNT entries; an empty string is an empty row. */
  slots: string[]
  /** Data URL or image URL for PORTRÉT. */
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
      sila: 0,
      obratnost: 0,
      odolnost: 0,
      inteligence: 0,
      moudrost: 0,
      charisma: 0,
    },
    slots: Array.from({ length: SLOT_COUNT }, () => ''),
    ...overrides,
  }
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
  return character.slots.filter((slot) => slot.trim() !== '').length
}
