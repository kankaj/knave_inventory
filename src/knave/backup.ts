import { packProfile, unpackProfile } from './codec'
import type { Profile } from './types'

/**
 * Room metadata lives and dies with the room. When the table stops playing for
 * a week there is nobody left holding the sheets, so every browser that has
 * opened the room keeps its own snapshot. Whoever comes back first pushes it
 * into the empty room and the party finds its sheets where it left them.
 */
const BACKUP_PREFIX = 'knave-inventory/backup/'

/** When the table last downloaded a portable backup of this room, per browser. */
const BACKUP_STAMP_PREFIX = 'knave-inventory/backup-stamp/'

/** The stored snapshot. Profiles are kept packed, same as in the room. */
export type Snapshot = {
  savedAt: number
  profiles: Profile[]
}

function backupKey(roomId: string): string {
  return `${BACKUP_PREFIX}${roomId}`
}

function backupStampKey(roomId: string): string {
  return `${BACKUP_STAMP_PREFIX}${roomId}`
}

/**
 * The room snapshot above only survives the room itself: deleting the room
 * deletes its metadata with it, and a fresh room gets a fresh id the snapshot
 * never matches. A portable export file is the only copy that outlives the
 * room, so the GM is reminded to take one until they actually do.
 */
export function recordBackupExport(roomId: string) {
  if (!roomId) return
  try {
    localStorage.setItem(backupStampKey(roomId), String(Date.now()))
  } catch {
    // Losing the stamp only means the reminder keeps showing, which is safe.
  }
}

export function lastBackupExportAt(roomId: string): number {
  if (!roomId) return 0
  try {
    const raw = localStorage.getItem(backupStampKey(roomId))
    const parsed = raw ? Number(raw) : 0
    return Number.isFinite(parsed) ? parsed : 0
  } catch {
    return 0
  }
}

export function saveSnapshot(roomId: string, profiles: readonly Profile[]) {
  if (!roomId) return
  try {
    localStorage.setItem(
      backupKey(roomId),
      JSON.stringify({
        savedAt: Date.now(),
        profiles: profiles.map(packProfile),
      }),
    )
  } catch {
    // Storage can be blocked inside a third-party iframe, and the room itself
    // is still the primary copy. Exporting to a file is the fallback then.
  }
}

export function loadSnapshot(roomId: string): Snapshot {
  if (!roomId) return { savedAt: 0, profiles: [] }
  try {
    const raw = localStorage.getItem(backupKey(roomId))
    if (!raw) return { savedAt: 0, profiles: [] }
    return parseSnapshot(raw)
  } catch {
    return { savedAt: 0, profiles: [] }
  }
}

/**
 * Read a snapshot, from local storage or from a file the table exported.
 * Unreadable input yields an empty snapshot rather than throwing, because the
 * caller can do nothing better than carry on with the room's own copy.
 */
export function parseSnapshot(raw: string): Snapshot {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { savedAt: 0, profiles: [] }
  }
  if (!parsed || typeof parsed !== 'object') return { savedAt: 0, profiles: [] }
  const input = parsed as { savedAt?: unknown; profiles?: unknown }
  const list = Array.isArray(input.profiles) ? input.profiles : []
  const profiles = list.map((entry, index) =>
    unpackProfile(entry, `restored-${index}`),
  )
  return {
    savedAt: typeof input.savedAt === 'number' ? input.savedAt : 0,
    profiles,
  }
}

export function serializeSnapshot(profiles: readonly Profile[]): string {
  const snapshot = { savedAt: Date.now(), profiles: profiles.map(packProfile) }
  return JSON.stringify(snapshot, null, 2)
}

/**
 * Which snapshot sheets belong back in the room.
 *
 * Only a room that has lost every sheet is refilled. A room that still holds
 * something is the newer truth — restoring into it would resurrect sheets the
 * table deleted on purpose, from whichever browser has the stalest snapshot.
 */
export function profilesToRestore(
  snapshot: readonly Profile[],
  roomProfiles: Record<string, Profile>,
): Profile[] {
  if (Object.keys(roomProfiles).length > 0) return []
  return snapshot.filter((profile) => profile.id !== '')
}
