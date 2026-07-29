import { useEffect, useState } from 'react'
import OBR from '@owlbear-rodeo/sdk'
import { CharacterSheet } from './knave/CharacterSheet'
import { ProfileSidebar } from './knave/ProfileSidebar'
import { useProfiles } from './knave/storage'
import { freeRows } from './knave/transfer'
import './knave/sheet.css'
import './App.css'

function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // OBR.onReady fires once the SDK has connected to the parent Owlbear
    // Rodeo window. Any other SDK call before this point will fail.
    return OBR.onReady(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="k-app-waiting">
        <p>
          Waiting for Owlbear Rodeo. Open this extension from a room to connect.
        </p>
      </div>
    )
  }

  return <Room />
}

/** Remembers whether the column was left open, per browser. */
const SIDEBAR_KEY = 'knave-inventory/sidebar-open'

function recallSidebar(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'closed'
  } catch {
    return true
  }
}

/** Mounted only after the SDK is ready, so every hook below can call it. */
function Room() {
  const {
    entries,
    selfProfileId,
    loaded,
    notice,
    dismissNotice,
    updateCharacter,
    claimProfile,
    addProfile,
    deleteProfile,
    sendBetween,
    exportProfiles,
    importProfiles,
  } = useProfiles()
  const [selectedId, setSelectedId] = useState('')
  const [sendNotice, setSendNotice] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(recallSidebar)

  const toggleSidebar = () => {
    setSidebarOpen((open) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, open ? 'closed' : 'open')
      } catch {
        // Only the remembered preference is lost.
      }
      return !open
    })
  }

  const active =
    entries.find((entry) => entry.profile.id === selectedId) ??
    entries.find((entry) => entry.profile.id === selfProfileId) ??
    entries[0]

  if (!active) {
    return (
      <div className="k-app-waiting">
        <p>{loaded ? 'Zakládám tvůj list…' : 'Připojuji se k místnosti…'}</p>
      </div>
    )
  }

  // The dead can hand things over but never take any, so they are left out of
  // the recipient list entirely.
  const sendTargets = entries
    .filter((entry) => entry.profile.id !== active.profile.id)
    .filter((entry) => !entry.profile.character.dead)
    .map((entry) => ({
      id: entry.profile.id,
      name: entry.displayName,
      freeRows: freeRows(entry.profile.character),
    }))

  const downloadBackup = () => {
    const url = URL.createObjectURL(
      new Blob([exportProfiles()], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `knave-deniky-${OBR.room.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="k-app" data-side={sidebarOpen}>
      {sidebarOpen && (
        <aside className="k-app-side" aria-label="Seznam deníků">
          <ProfileSidebar
            entries={entries}
            activeId={active.profile.id}
            onSelect={setSelectedId}
            onAdd={() => {
              void addProfile().then((id) => id && setSelectedId(id))
            }}
            onClose={toggleSidebar}
            onExport={downloadBackup}
            onImport={(file) => {
              void file.text().then((raw) => void importProfiles(raw))
            }}
          />
        </aside>
      )}

      <div className="k-app-main">
        {/* The bar keeps its height while the column covers it, so opening the
            column never nudges the sheet. */}
        <div className="k-app-bar">
          {!sidebarOpen && (
            <button
              type="button"
              className="k-app-action k-side-toggle"
              aria-expanded={false}
              onClick={toggleSidebar}
              title="Otevřít seznam deníků"
            >
              ☰ deníky
            </button>
          )}
        </div>

        {notice && (
          <p className="k-app-notice" role="status">
            <span>{notice}</span>
            <button
              type="button"
              className="k-app-action"
              onClick={dismissNotice}
            >
              OK
            </button>
          </p>
        )}

        <div className="k-app-sheet">
          <CharacterSheet
            character={active.profile.character}
            onChange={(next) => updateCharacter(active.profile.id, next)}
            sendNotice={sendNotice}
            sendTargets={sendTargets}
            onSend={(targetId, indices) => {
              setSendNotice('')
              void sendBetween(active.profile.id, targetId, indices).then(
                (result) => {
                  const target = entries.find(
                    (entry) => entry.profile.id === targetId,
                  )
                  if (result.ok) {
                    setSendNotice(
                      `Posláno ${target?.displayName ?? ''}: ${result.moved.join(', ')}`,
                    )
                  } else if (result.reason === 'no-room') {
                    setSendNotice(
                      `${target?.displayName ?? 'Příjemce'} má volno jen ${result.free} — posíláš ${result.needed}.`,
                    )
                  } else if (result.reason === 'recipient-dead') {
                    setSendNotice(
                      `${target?.displayName ?? 'Příjemce'} je mrtvý a nemůže nic přijmout.`,
                    )
                  } else {
                    setSendNotice('Nic není vybráno k poslání.')
                  }
                },
              )
            }}
          />
        </div>

        <div className="k-app-foot">
          <span className="k-app-note">
            {active.isSelf
              ? 'Tvůj list. Vidí ho a může upravovat kdokoli v místnosti.'
              : `List hráče ${active.displayName}. Úpravy vidí všichni.`}
          </span>
          <span className="k-app-actions">
            {!active.isSelf && (
              <button
                type="button"
                className="k-app-action"
                onClick={() => void claimProfile(active.profile.id)}
              >
                Převzít
              </button>
            )}
            <label className="k-dead-switch">
              <input
                type="checkbox"
                checked={active.profile.character.dead}
                onChange={(event) =>
                  updateCharacter(active.profile.id, {
                    ...active.profile.character,
                    dead: event.target.checked,
                  })
                }
              />
              Mrtvý
            </label>
            <button
              type="button"
              className="k-app-action k-app-action-warn"
              onClick={() => void deleteProfile(active.profile.id)}
            >
              Vymazat
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

export default App
