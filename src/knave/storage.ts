import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OBR, { type Player } from '@owlbear-rodeo/sdk'
import {
  loadSnapshot,
  parseSnapshot,
  profilesToRestore,
  saveSnapshot,
  serializeSnapshot,
} from './backup'
import {
  ROOM_BUDGET_BYTES,
  jsonBytes,
  packProfile,
  unpackProfile,
} from './codec'
import { chooseProfile } from './identity'
import { compareProfiles } from './ordering'
import { sendItems, type SendResult } from './transfer'
import {
  createCharacter,
  createProfile,
  emptyStashSlots,
  type Character,
  type Profile,
} from './types'
import { isVisibleToViewer } from './visibility'

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
    profiles[id] = unpackProfile(value, id)
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
  const [notice, setNotice] = useState('')
  // The room id is there as soon as the SDK is ready, which is before this hook
  // ever runs, so it needs no state of its own.
  const roomId = OBR.room.id

  // Characters edited locally that the room has not echoed back yet.
  const pending = useRef(new Map<string, Character>())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const claimed = useRef(false)
  const restored = useRef(false)
  // Everything in the room's metadata, ours and other extensions' alike. Needed
  // to tell whether the next write still fits the 16 kB the room allows.
  const roomMetadata = useRef<Record<string, unknown>>({})
  // Read before the first write, so an empty room cannot overwrite the snapshot
  // we may still have to restore from.
  const [snapshot] = useState(() => loadSnapshot(roomId))

  /**
   * Write to the room, but never blindly: over the cap Owlbear rejects the
   * whole update, and a rejection nobody reports is data quietly disappearing.
   */
  const writeMetadata = useCallback(
    async (patch: Record<string, unknown>): Promise<boolean> => {
      const merged: Record<string, unknown> = {
        ...roomMetadata.current,
        ...patch,
      }
      for (const [key, value] of Object.entries(merged)) {
        if (value === undefined) delete merged[key]
      }
      if (jsonBytes(merged) > ROOM_BUDGET_BYTES) {
        setNotice(
          'Místnost je plná — Owlbear dá extenzi jen 16 kB. Stáhni si zálohu a vymaž staré deníky, jinak se změny neuloží.',
        )
        return false
      }
      try {
        await OBR.room.setMetadata(patch)
        roomMetadata.current = merged
        return true
      } catch (error) {
        setNotice(
          `Uložení do místnosti selhalo: ${error instanceof Error ? error.message : String(error)}`,
        )
        return false
      }
    },
    [],
  )

  const flush = useCallback(async () => {
    if (pending.current.size === 0) return
    const batch = new Map(pending.current)
    const patch: Record<string, unknown> = {}
    setProfiles((current) => {
      for (const [profileId, character] of batch) {
        const profile = current[profileId]
        if (profile) {
          patch[profileKey(profileId)] = packProfile({ ...profile, character })
        }
      }
      return current
    })
    if (Object.keys(patch).length === 0) return
    // Keep the queued keystrokes when the write was refused: they are then the
    // only copy of what was typed, and the notice tells the table why.
    if (!(await writeMetadata(patch))) return
    for (const [profileId, character] of batch) {
      if (pending.current.get(profileId) === character) {
        pending.current.delete(profileId)
      }
    }
  }, [writeMetadata])

  useEffect(() => {
    let active = true

    const applyMetadata = (metadata: Record<string, unknown>) => {
      if (!active) return
      roomMetadata.current = metadata
      const remote = readProfiles(metadata)
      // Local edits win until the room confirms them.
      for (const [profileId, character] of pending.current) {
        const profile = remote[profileId]
        if (profile) remote[profileId] = { ...profile, character }
      }
      setProfiles(remote)
      setLoaded(true)
      // Keep this browser's copy of the room current, so the sheets outlive the
      // room itself between sessions.
      const list = Object.values(remote)
      if (list.length > 0) saveSnapshot(roomId, list)
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
  }, [roomId])

  useEffect(() => {
    // Do not lose the last keystrokes when the popover closes.
    return () => {
      if (timer.current) clearTimeout(timer.current)
      void flush()
    }
  }, [flush])

  const writeProfiles = useCallback(
    async (list: readonly Profile[]): Promise<boolean> => {
      if (list.length === 0) return true
      setProfiles((current) => {
        const next = { ...current }
        for (const profile of list) next[profile.id] = profile
        return next
      })
      const patch: Record<string, unknown> = {}
      for (const profile of list) {
        patch[profileKey(profile.id)] = packProfile(profile)
      }
      return writeMetadata(patch)
    },
    [writeMetadata],
  )

  const writeProfile = useCallback(
    async (profile: Profile) => writeProfiles([profile]),
    [writeProfiles],
  )

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

  /**
   * A room-wide loot container, not owned by anyone. Leaving `ownerId` empty
   * matters: `chooseProfile`'s "owned" tier matches on player id, and giving
   * the stash the GM's id would risk it being auto-selected as their own
   * sheet on the next reconnect instead of their actual character.
   */
  const addStashProfile = useCallback(async () => {
    const profile = createProfile({
      hidden: true,
      character: createCharacter({
        kind: 'stash',
        name: 'Předměty',
        slots: emptyStashSlots(),
      }),
    })
    await writeProfile(profile)
    return profile.id
  }, [writeProfile])

  const toggleHidden = useCallback(
    async (profileId: string) => {
      const profile = profiles[profileId]
      if (!profile) return
      await writeProfile({ ...profile, hidden: !profile.hidden })
    },
    [profiles, writeProfile],
  )

  // A room that came back empty gets its sheets pushed back from this browser's
  // snapshot, before anybody starts a fresh sheet on top of the loss.
  useEffect(() => {
    if (!loaded || restored.current) return
    restored.current = true
    const missing = profilesToRestore(snapshot.profiles, profiles)
    if (missing.length === 0) return
    void writeProfiles(missing).then((ok) => {
      if (ok) {
        setNotice(
          `Místnost byla prázdná — obnoveno ${missing.length} deníků z místní zálohy.`,
        )
      }
    })
  }, [loaded, profiles, snapshot, writeProfiles])

  // Re-attach this player to their sheet. The decision itself lives in
  // chooseProfile so it can be tested without a live room.
  useEffect(() => {
    if (!loaded || !self || claimed.current) return
    // Wait for the restore pass: without it the restored sheets are invisible
    // to the matching below and everyone would start over on a new sheet.
    if (!restored.current) return
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

      // Drop queued keystrokes for both sheets; the transfer supersedes them.
      pending.current.delete(fromId)
      pending.current.delete(toId)
      await writeProfiles([
        { ...from, character: result.from },
        { ...to, character: result.to },
      ])
      return result
    },
    [profiles, writeProfiles],
  )

  const deleteProfile = useCallback(
    async (profileId: string) => {
      pending.current.delete(profileId)
      const remaining: Profile[] = []
      setProfiles((current) => {
        const next = { ...current }
        delete next[profileId]
        remaining.push(...Object.values(next))
        return next
      })
      // Take it out of the snapshot as well, or the next reconnect into an
      // emptied room would restore the sheet the table just deleted.
      saveSnapshot(roomId, remaining)
      await writeMetadata({ [profileKey(profileId)]: undefined })
    },
    [roomId, writeMetadata],
  )

  /** The whole room as a file the table can keep outside Owlbear. */
  const exportProfiles = useCallback(
    () => serializeSnapshot(Object.values(profiles)),
    [profiles],
  )

  /** Merge an exported file back in. Sheets with the same id are overwritten. */
  const importProfiles = useCallback(
    async (raw: string): Promise<number> => {
      const incoming = parseSnapshot(raw)
      if (incoming.profiles.length === 0) {
        setNotice('V souboru nejsou žádné deníky.')
        return 0
      }
      if (!(await writeProfiles(incoming.profiles))) return 0
      setNotice(`Načteno ${incoming.profiles.length} deníků ze souboru.`)
      return incoming.profiles.length
    },
    [writeProfiles],
  )

  const isGM = self?.role === 'GM'

  const entries: ProfileEntry[] = useMemo(() => {
    const list = Object.values(profiles)
      .filter((profile) => isVisibleToViewer(profile, isGM))
      .map((profile) => {
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
    // Grouped by owner, oldest sheet of each owner on top.
    return list.sort(compareProfiles)
  }, [isGM, players, profiles, self])

  const selfProfileId =
    entries.find((entry) => entry.isSelf)?.profile.id ?? entries[0]?.profile.id

  const dismissNotice = useCallback(() => setNotice(''), [])

  return {
    entries,
    selfProfileId,
    loaded,
    notice,
    dismissNotice,
    isGM,
    updateCharacter,
    claimProfile,
    addProfile,
    addStashProfile,
    toggleHidden,
    deleteProfile,
    sendBetween,
    exportProfiles,
    importProfiles,
  }
}
