import { describe, expect, it } from 'vitest'
import { chooseProfile } from './identity'
import { createProfile, type Profile } from './types'

function profile(overrides: Partial<Profile>): Profile {
  return createProfile({ id: 'sheet', ...overrides })
}

function index(...list: Profile[]): Record<string, Profile> {
  return Object.fromEntries(list.map((item) => [item.id, item]))
}

describe('chooseProfile', () => {
  it('keeps the sheet that already carries our player id', () => {
    const mine = profile({ id: 'mine', ownerId: 'p1', ownerName: 'Jarmila' })
    const other = profile({ id: 'other', ownerId: 'p2', ownerName: 'Bohuš' })

    expect(
      chooseProfile({
        profiles: index(mine, other),
        selfId: 'p1',
        selfName: 'Jarmila',
        connectedIds: ['p1', 'p2'],
        rememberedId: '',
      }),
    ).toEqual({ action: 'keep', profileId: 'mine', tier: 'owned' })
  })

  it('claims the remembered sheet after a reconnect changed our id', () => {
    // Same browser, new session: the old ownerId is stale.
    const mine = profile({
      id: 'mine',
      ownerId: 'old-p1',
      ownerName: 'Jarmila',
    })

    expect(
      chooseProfile({
        profiles: index(mine),
        selfId: 'new-p1',
        selfName: 'Jarmila',
        connectedIds: ['new-p1'],
        rememberedId: 'mine',
      }),
    ).toEqual({ action: 'claim', profileId: 'mine', tier: 'remembered' })
  })

  it('falls back to the owner name when this browser remembers nothing', () => {
    const mine = profile({
      id: 'mine',
      ownerId: 'old-p1',
      ownerName: 'Jarmila',
    })

    expect(
      chooseProfile({
        profiles: index(mine),
        selfId: 'new-p1',
        selfName: 'Jarmila',
        connectedIds: ['new-p1'],
        rememberedId: '',
      }),
    ).toEqual({ action: 'claim', profileId: 'mine', tier: 'name' })
  })

  it('never takes a name match whose owner is in the room', () => {
    // Two players share a display name and both are connected.
    const theirs = profile({
      id: 'theirs',
      ownerId: 'p2',
      ownerName: 'Jarmila',
    })

    expect(
      chooseProfile({
        profiles: index(theirs),
        selfId: 'p1',
        selfName: 'Jarmila',
        connectedIds: ['p1', 'p2'],
        rememberedId: '',
      }),
    ).toEqual({ action: 'create', tier: 'new' })
  })

  it('ignores a remembered id that is no longer in the room metadata', () => {
    expect(
      chooseProfile({
        profiles: {},
        selfId: 'p1',
        selfName: 'Jarmila',
        connectedIds: ['p1'],
        rememberedId: 'deleted-sheet',
      }),
    ).toEqual({ action: 'create', tier: 'new' })
  })

  it('does not match unnamed sheets by name', () => {
    const blank = profile({ id: 'blank', ownerId: '', ownerName: '' })

    expect(
      chooseProfile({
        profiles: index(blank),
        selfId: 'p1',
        selfName: '',
        connectedIds: ['p1'],
        rememberedId: '',
      }),
    ).toEqual({ action: 'create', tier: 'new' })
  })

  it('prefers the remembered sheet over a name match', () => {
    const remembered = profile({
      id: 'a',
      ownerId: 'old',
      ownerName: 'Jarmila',
    })
    const sameName = profile({ id: 'b', ownerId: 'gone', ownerName: 'Jarmila' })

    expect(
      chooseProfile({
        profiles: index(remembered, sameName),
        selfId: 'p1',
        selfName: 'Jarmila',
        connectedIds: ['p1'],
        rememberedId: 'a',
      }),
    ).toEqual({ action: 'claim', profileId: 'a', tier: 'remembered' })
  })

  it('starts a fresh sheet in an empty room', () => {
    expect(
      chooseProfile({
        profiles: {},
        selfId: 'p1',
        selfName: 'Jarmila',
        connectedIds: ['p1'],
        rememberedId: '',
      }),
    ).toEqual({ action: 'create', tier: 'new' })
  })
})
