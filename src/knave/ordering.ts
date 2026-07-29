/** The parts of a sheet the sidebar order depends on. */
export type Orderable = {
  profile: { id: string; ownerName: string; createdAt: number }
}

const collator = new Intl.Collator('cs', { sensitivity: 'base' })

/**
 * Sidebar order: grouped by owner, and within one owner the oldest sheet on
 * top, so sheets never shuffle around as they are edited or renamed. Sheets
 * nobody owns sink to the bottom.
 */
export function compareProfiles(a: Orderable, b: Orderable): number {
  const ownerA = a.profile.ownerName.trim()
  const ownerB = b.profile.ownerName.trim()
  if ((ownerA === '') !== (ownerB === '')) return ownerA === '' ? 1 : -1
  const byOwner = collator.compare(ownerA, ownerB)
  if (byOwner !== 0) return byOwner
  if (a.profile.createdAt !== b.profile.createdAt) {
    return a.profile.createdAt - b.profile.createdAt
  }
  // Same owner, same timestamp: the id keeps the order stable between renders.
  return a.profile.id.localeCompare(b.profile.id)
}
