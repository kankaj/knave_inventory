import type { ProfileEntry } from './storage'

export type ProfileSidebarProps = {
  entries: ProfileEntry[]
  activeId: string
  onSelect: (profileId: string) => void
  onAdd: () => void
  /** Hide the column again; it stands where the open button was. */
  onClose: () => void
  /** Hand the room out as a file. */
  onExport: () => void
  /** Read a previously exported file back into the room. */
  onImport: (file: File) => void
}

type Group = { owner: string; entries: ProfileEntry[] }

/**
 * Sheets already arrive ordered by owner and then by age, so consecutive runs
 * of the same owner form the groups; no second sort is needed here.
 */
function groupByOwner(entries: readonly ProfileEntry[]): Group[] {
  const groups: Group[] = []
  for (const entry of entries) {
    const owner = entry.profile.ownerName.trim() || 'Bez majitele'
    const last = groups.at(-1)
    if (last && last.owner === owner) last.entries.push(entry)
    else groups.push({ owner, entries: [entry] })
  }
  return groups
}

/** The column of every sheet in the room, grouped under its owner. */
export function ProfileSidebar({
  entries,
  activeId,
  onSelect,
  onAdd,
  onClose,
  onExport,
  onImport,
}: ProfileSidebarProps) {
  return (
    <div className="k-side">
      <div className="k-side-head">
        <h2 className="k-side-title">Deníky</h2>
        <button
          type="button"
          className="k-side-close"
          aria-label="Zavřít seznam deníků"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="k-side-list" role="tablist" aria-label="Deníky postav">
        {groupByOwner(entries).map((group) => (
          <div className="k-side-group" key={group.owner}>
            <p className="k-side-owner">{group.owner}</p>
            {group.entries.map((entry) => (
              <button
                key={entry.profile.id}
                type="button"
                role="tab"
                className="k-side-item"
                aria-selected={entry.profile.id === activeId}
                data-active={entry.profile.id === activeId}
                data-offline={!entry.connected}
                data-dead={entry.profile.character.dead}
                onClick={() => onSelect(entry.profile.id)}
              >
                <span
                  className="k-side-dot"
                  style={{ background: entry.color }}
                  aria-hidden="true"
                />
                <span className="k-side-name">{entry.displayName}</span>
                {entry.isSelf && <span className="k-side-role">ty</span>}
                {!entry.connected && (
                  <span className="k-side-role" title="Hráč není v místnosti">
                    pryč
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      <button type="button" className="k-side-add" onClick={onAdd}>
        + nový deník
      </button>

      <div className="k-side-backup">
        <button type="button" className="k-side-file" onClick={onExport}>
          Stáhnout zálohu
        </button>
        <label className="k-side-file">
          Načíst zálohu
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0]
              // Clear the input so picking the same file twice still fires.
              event.target.value = ''
              if (file) onImport(file)
            }}
          />
        </label>
      </div>
    </div>
  )
}
