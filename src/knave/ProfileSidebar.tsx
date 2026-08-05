import { useState } from 'react'
import { IconClose, IconDownload, IconPlus, IconUpload } from './icons'
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

/**
 * The column of every sheet in the room, grouped under its owner.
 *
 * The list is navigation, not a tab strip: it used to claim role="tablist"
 * without a panel to point at, which promises a screen reader arrow-key
 * movement and a tabpanel that were never there. Plain buttons carrying
 * aria-current say the true thing.
 */
export function ProfileSidebar({
  entries,
  activeId,
  onSelect,
  onAdd,
  onClose,
  onExport,
  onImport,
}: ProfileSidebarProps) {
  // Reading a file back overwrites sheets that are on the table right now, so
  // the picked file waits here until somebody says yes.
  const [pending, setPending] = useState<File | undefined>()

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
          <IconClose />
        </button>
      </div>

      <nav className="k-side-list" aria-label="Deníky postav">
        {groupByOwner(entries).map((group) => (
          <div className="k-side-group" key={group.owner}>
            <p className="k-side-owner">{group.owner}</p>
            {group.entries.map((entry) => (
              <button
                key={entry.profile.id}
                type="button"
                className="k-side-item"
                aria-current={entry.profile.id === activeId}
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
                {!entry.connected && <span className="k-side-role">pryč</span>}
                {/* Struck-through type says this on the page; a screen reader
                    has no strikethrough to read. */}
                {entry.profile.character.dead && (
                  <span className="k-sr">mrtvý</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <button type="button" className="k-side-add" onClick={onAdd}>
        <IconPlus size={0.95} />
        nový deník
      </button>

      {pending ? (
        <div
          className="k-side-confirm"
          role="alertdialog"
          aria-label="Načíst zálohu"
        >
          <span>
            Přepsat deníky v místnosti obsahem souboru{' '}
            <span className="k-side-confirm-name">{pending.name}</span>?
          </span>
          <div className="k-side-confirm-row">
            <button
              type="button"
              className="k-app-action k-app-action-armed"
              autoFocus
              onClick={() => {
                const file = pending
                setPending(undefined)
                onImport(file)
              }}
            >
              Přepsat
            </button>
            <button
              type="button"
              className="k-app-action"
              onClick={() => setPending(undefined)}
            >
              Zrušit
            </button>
          </div>
        </div>
      ) : (
        <div className="k-side-backup">
          <button type="button" className="k-side-file" onClick={onExport}>
            <IconDownload size={1.1} />
            Stáhnout zálohu
          </button>
          <label className="k-side-file">
            <IconUpload size={1.1} />
            Načíst zálohu
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                // Clear the input so picking the same file twice still fires.
                event.target.value = ''
                if (file) setPending(file)
              }}
            />
          </label>
        </div>
      )}
    </div>
  )
}
