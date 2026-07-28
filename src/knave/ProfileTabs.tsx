import type { ProfileEntry } from './storage'

export type ProfileTabsProps = {
  entries: ProfileEntry[]
  activeId: string
  onSelect: (profileId: string) => void
  onAdd: () => void
}

/** The menu of every sheet in the room, one tab each. */
export function ProfileTabs({
  entries,
  activeId,
  onSelect,
  onAdd,
}: ProfileTabsProps) {
  return (
    <div className="k-tabs" role="tablist" aria-label="Listy postav">
      {entries.map((entry) => (
        <button
          key={entry.profile.id}
          type="button"
          role="tab"
          className="k-tab"
          aria-selected={entry.profile.id === activeId}
          data-active={entry.profile.id === activeId}
          data-offline={!entry.connected}
          onClick={() => onSelect(entry.profile.id)}
        >
          <span
            className="k-tab-dot"
            style={{ background: entry.color }}
            aria-hidden="true"
          />
          <span className="k-tab-name">{entry.displayName}</span>
          {entry.isSelf && <span className="k-tab-role">ty</span>}
          {!entry.connected && (
            <span className="k-tab-role" title="Hráč není v místnosti">
              pryč
            </span>
          )}
        </button>
      ))}
      <button
        type="button"
        className="k-tab k-tab-add"
        onClick={onAdd}
        title="Nový list"
      >
        + list
      </button>
    </div>
  )
}
