import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OBR, { type Player } from '@owlbear-rodeo/sdk'
import { chooseProfile } from './identity'
import { sendItems, type SendResult } from './transfer'
import {
  createProfile,
  normalizeProfile,
  type Character,
  type Profile,
} from './types'

/**
 * One room-metadata key per profile. Owlbear merges metadata by top-level key,
 * so two people editing two different sheets never overwrite each other. A
 * single key holding every profile would make the last writer win.
 */
export const METADATA_PREFIX = 'cz.bigroot.knave-inventory/profile/'

/** How long to batch keystrokes before writing to the room. */
const WRITE_DELAY_MS = 350

export type ProfileEntry = {
  profile: Profile
  displayName: string
  color: string
  /** True when the owning player is in the room right now. */
  connected: boolean
  isSelf: boolean
}

type Self = { id: string; name: string; color: string; role: 'GM' | 'PLAYER' }

type ProfileMap = Record<string, Profile>

const OFFLINE_COLOR = '#8a8178'

function profileKey(profileId: string): string {
  return `${METADATA_PREFIX}${profileId}`
}

function readProfiles(metadata: Record<string, unknown>): ProfileMap {
  const profiles: ProfileMap = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (!key.startsWith(METADATA_PREFIX)) continue
    if (!value || typeof value !== 'object') continue
    const id = key.slice(METADATA_PREFIX.length)
    profiles[id] = normalizeProfile(value, id)
  }
  return profiles
}

/** Remembers which sheet belongs to this browser, per room. */
function memoryKey(roomId: string): string {
  return `knave-inventory/room/${roomId}/profile`
}

function remember(roomId: string, profileId: string) {
  try {
    localStorage.setItem(memoryKey(roomId), profileId)
  } catch {
    // Storage can be blocked inside a third-party iframe; the name match
    // below still re-finds the sheet, and claiming by hand always works.
  }
}

function recall(roomId: string): string {
  try {
    return localStorage.getItem(memoryKey(roomId)) ?? ''
  } catch {
    return ''
  }
}

/**
 * Room-wide character profiles. Every connected player can read and write
 * every profile — room metadata is shared, so there is no per-player
 * permission to enforce.
 */
export function useProfiles() {
  const [profiles, setProfiles] = useState<ProfileMap>({})
  const [players, setPlayers] = useState<Player[]>([])
  const [self, setSelf] = useState<Self | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)
  const [roomId, setRoomId] = useState('')

  // Characters edited locally that the room has not echoed back yet.
  const pending = useRef(new Map<string, Character>())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const claimed = useRef(false)

  const flush = useCallback(async () => {
    if (pending.current.size === 0) return
    const batch = new Map(pending.current)
    const patch: Record<string, Profile> = {}
    setProfiles((current) => {
      for (const [profileId, character] of batch) {
        const profile = current[profileId]
        if (profile) patch[profileKey(profileId)] = { ...profile, character }
      }
      return current
    })
    if (Object.keys(patch).length > 0) await OBR.room.setMetadata(patch)
    for (const [profileId, character] of batch) {
      if (pending.current.get(profileId) === character) {
        pending.current.delete(profileId)
      }
    }
  }, [])

  useEffect(() => {
    let active = true

    const applyMetadata = (metadata: Record<string, unknown>) => {
      if (!active) return
      const remote = readProfiles(metadata)
      // Local edits win until the room confirms them.
      for (const [profileId, character] of pending.current) {
        const profile = remote[profileId]
        if (profile) remote[profileId] = { ...profile, character }
      }
      setProfiles(remote)
      setLoaded(true)
    }

    const applySelf = async () => {
      const [id, name, role, color] = await Promise.all([
        OBR.player.getId(),
        OBR.player.getName(),
        OBR.player.getRole(),
        OBR.player.getColor(),
      ])
      if (active) setSelf({ id, name, role, color })
    }

    setRoomId(OBR.room.id)
    void OBR.room.getMetadata().then(applyMetadata)
    void OBR.party.getPlayers().then((party) => active && setPlayers(party))
    void applySelf()

    const unsubscribeMetadata = OBR.room.onMetadataChange(applyMetadata)
    const unsubscribeParty = OBR.party.onChange((party) => {
      if (active) setPlayers(party)
    })
    const unsubscribeSelf = OBR.player.onChange(() => void applySelf())

    return () => {
      active = false
      unsubscribeMetadata()
      unsubscribeParty()
      unsubscribeSelf()
    }
  }, [])

  useEffect(() => {
    // Do not lose the last keystrokes when the popover closes.
    return () => {
      if (timer.current) clearTimeout(timer.current)
      void flush()
    }
  }, [flush])

  const writeProfile = useCallback(async (profile: Profile) => {
    setProfiles((current) => ({ ...current, [profile.id]: profile }))
    await OBR.room.setMetadata({ [profileKey(profile.id)]: profile })
  }, [])

  const claimProfile = useCallback(
    async (profileId: string) => {
      if (!self) return
      const profile = profiles[profileId]
      if (!profile) return
      remember(roomId, profileId)
      await writeProfile({
        ...profile,
        ownerId: self.id,
        ownerName: self.name,
      })
    },
    [profiles, roomId, self, writeProfile],
  )

  const addProfile = useCallback(async () => {
    if (!self) return
    const profile = createProfile({ ownerId: self.id, ownerName: self.name })
    remember(roomId, profile.id)
    await writeProfile(profile)
    return profile.id
  }, [roomId, self, writeProfile])

  // Re-attach this player to their sheet. The decision itself lives in
  // chooseProfile so it can be tested without a live room.
  useEffect(() => {
    if (!loaded || !self || claimed.current) return
    claimed.current = true

    const choice = chooseProfile({
      profiles,
      selfId: self.id,
      selfName: self.name,
      connectedIds: [self.id, ...players.map((player) => player.id)],
      rememberedId: recall(roomId),
    })

    if (choice.action === 'keep') {
      remember(roomId, choice.profileId)
    } else if (choice.action === 'claim') {
      void claimProfile(choice.profileId)
    } else {
      void addProfile()
    }
  }, [addProfile, claimProfile, loaded, players, profiles, roomId, self])

  const updateCharacter = useCallback(
    (profileId: string, character: Character) => {
      pending.current.set(profileId, character)
      setProfiles((current) => {
        const profile = current[profileId]
        if (!profile) return current
        return { ...current, [profileId]: { ...profile, character } }
      })
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), WRITE_DELAY_MS)
    },
    [flush],
  )

  /**
   * Move items between two sheets in one write, so nobody sees an in-between
   * state where the items exist twice or not at all.
   */
  const sendBetween = useCallback(
    async (
      fromId: string,
      toId: string,
      indices: readonly number[],
    ): Promise<SendResult> => {
      const from = profiles[fromId]
      const to = profiles[toId]
      if (!from || !to) {
        return { ok: false, reason: 'no-selection', free: 0, needed: 0 }
      }

      const result = sendItems(from.character, to.character, indices)
      if (!result.ok) return result

      const nextFrom = { ...from, character: result.from }
      const nextTo = { ...to, character: result.to }
      // Drop queued keystrokes for both sheets; the transfer supersedes them.
      pending.current.delete(fromId)
      pending.current.delete(toId)
      setProfiles((current) => ({
        ...current,
        [fromId]: nextFrom,
        [toId]: nextTo,
      }))
      await OBR.room.setMetadata({
        [profileKey(fromId)]: nextFrom,
        [profileKey(toId)]: nextTo,
      })
      return result
    },
    [profiles],
  )

  const deleteProfile = useCallback(async (profileId: string) => {
    pending.current.delete(profileId)
    setProfiles((current) => {
      const next = { ...current }
      delete next[profileId]
      return next
    })
    await OBR.room.setMetadata({ [profileKey(profileId)]: undefined })
  }, [])

  const entries: ProfileEntry[] = useMemo(() => {
    const list = Object.values(profiles).map((profile) => {
      const owner = players.find((player) => player.id === profile.ownerId)
      const isSelf = self !== undefined && profile.ownerId === self.id
      const connected = isSelf || owner !== undefined
      return {
        profile,
        displayName:
          profile.character.name ||
          profile.ownerName ||
          owner?.name ||
          'Nový list',
        color: isSelf
          ? (self?.color ?? OFFLINE_COLOR)
          : (owner?.color ?? OFFLINE_COLOR),
        connected,
        isSelf,
      }
    })
    // Mine first, then everyone present, then sheets nobody is holding.
    return list.sort((a, b) => {
      if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1
      if (a.connected !== b.connected) return a.connected ? -1 : 1
      return a.displayName.localeCompare(b.displayName, 'cs')
    })
  }, [players, profiles, self])

  const selfProfileId =
    entries.find((entry) => entry.isSelf)?.profile.id ?? entries[0]?.profile.id

  return {
    entries,
    selfProfileId,
    loaded,
    updateCharacter,
    claimProfile,
    addProfile,
    deleteProfile,
    sendBetween,
  }
}
