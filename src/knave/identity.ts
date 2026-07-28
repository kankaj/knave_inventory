import type { Profile } from './types'

export type ChooseProfileInput = {
  profiles: Record<string, Profile>
  /** Owlbear player id for this connection. */
  selfId: string
  /** Owlbear display name for this connection. */
  selfName: string
  /** Player ids currently in the room, including our own. */
  connectedIds: readonly string[]
  /** Profile id this browser remembered for this room, if any. */
  rememberedId: string
}

export type ChooseProfileResult =
  | { action: 'keep'; profileId: string; tier: 'owned' }
  | { action: 'claim'; profileId: string; tier: 'remembered' | 'name' }
  | { action: 'create'; profileId?: undefined; tier: 'new' }

/**
 * Decide which sheet belongs to this player on open.
 *
 * Owlbear player ids change between sessions, so ownership has to be
 * re-established every time. Tiers, in order:
 *
 * 1. `owned`      — a profile already carries our current player id.
 * 2. `remembered` — this browser noted the profile id for this room.
 * 3. `name`       — a profile's owner name matches ours and that owner is not
 *                   in the room, so taking it cannot steal an active sheet.
 * 4. `new`        — nothing matched; start a fresh sheet.
 */
export function chooseProfile({
  profiles,
  selfId,
  selfName,
  connectedIds,
  rememberedId,
}: ChooseProfileInput): ChooseProfileResult {
  const all = Object.values(profiles)

  const owned = all.find(
    (profile) => selfId !== '' && profile.ownerId === selfId,
  )
  if (owned) return { action: 'keep', profileId: owned.id, tier: 'owned' }

  const remembered = rememberedId ? profiles[rememberedId] : undefined
  if (remembered) {
    return { action: 'claim', profileId: remembered.id, tier: 'remembered' }
  }

  const byName = all.find(
    (profile) =>
      profile.ownerName !== '' &&
      profile.ownerName === selfName &&
      !connectedIds.includes(profile.ownerId),
  )
  if (byName) return { action: 'claim', profileId: byName.id, tier: 'name' }

  return { action: 'create', tier: 'new' }
}
