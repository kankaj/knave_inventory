import { describe, expect, it } from 'vitest'
import { parseSnapshot, profilesToRestore, serializeSnapshot } from './backup'
import { createCharacter, createProfile, type Profile } from './types'

function sheet(id: string, name: string): Profile {
  return createProfile({
    id,
    ownerName: name,
    createdAt: 1000,
    character: createCharacter({ name }),
  })
}

function index(...list: Profile[]): Record<string, Profile> {
  return Object.fromEntries(list.map((profile) => [profile.id, profile]))
}

describe('serializeSnapshot / parseSnapshot', () => {
  it('carries the sheets through a file unchanged', () => {
    const profiles = [sheet('a', 'Jarmila'), sheet('b', 'Bohuš')]
    expect(parseSnapshot(serializeSnapshot(profiles)).profiles).toEqual(
      profiles,
    )
  })

  it('treats unreadable input as no backup at all', () => {
    expect(parseSnapshot('not json').profiles).toEqual([])
    expect(parseSnapshot('{"profiles":"nope"}').profiles).toEqual([])
    expect(parseSnapshot('null').profiles).toEqual([])
  })
})

describe('profilesToRestore', () => {
  it('refills a room that came back empty', () => {
    const backup = [sheet('a', 'Jarmila'), sheet('b', 'Bohuš')]
    expect(profilesToRestore(backup, {})).toEqual(backup)
  })

  it('leaves a room that still holds sheets alone', () => {
    // The room is the newer truth: restoring here would bring back sheets the
    // table deleted on purpose.
    const backup = [sheet('a', 'Jarmila'), sheet('b', 'Bohuš')]
    expect(profilesToRestore(backup, index(sheet('a', 'Jarmila')))).toEqual([])
  })

  it('has nothing to do without a backup', () => {
    expect(profilesToRestore([], {})).toEqual([])
  })
})
