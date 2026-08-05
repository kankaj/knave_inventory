import { useEffect, useState } from 'react'
import OBR from '@owlbear-rodeo/sdk'
import { CharacterSheet } from './knave/CharacterSheet'
import { ProfileSidebar } from './knave/ProfileSidebar'
import {
  IconChest,
  IconClaim,
  IconEye,
  IconEyeOff,
  IconList,
  IconTrash,
} from './knave/icons'
import { lastBackupExportAt, recordBackupExport } from './knave/backup'
import { useProfiles } from './knave/storage'
import { freeRows } from './knave/transfer'
import './knave/sheet.css'

function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // OBR.onReady fires once the SDK has connected to the parent Owlbear
    // Rodeo window. Any other SDK call before this point will fail.
    return OBR.onReady(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <main className="k-app-waiting">
        <p>Čekám na Owlbear Rodeo. Otevři rozšíření z místnosti.</p>
      </main>
    )
  }

  return <Room />
}

/** Remembers whether the column was left open, per browser. */
const SIDEBAR_KEY = 'knave-inventory/sidebar-open'

/** How stale a portable backup can get before the GM is nudged again. */
const BACKUP_NUDGE_DAYS = 7

/** The panel the bar's toggle opens, named so the button can point at it. */
const SIDEBAR_ID = 'k-journal-list'

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
  } = useProfiles()
  const [selectedId, setSelectedId] = useState('')
  const [sendNotice, setSendNotice] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(recallSidebar)
  // Which sheet has had its delete button armed. Keyed by id rather than a
  // bare flag, so walking to another journal disarms it on the way.
  const [armedDeleteId, setArmedDeleteId] = useState('')
  // A room survives forever, but deleting it takes its metadata with it, and a
  // fresh room won't match this stamp — only a downloaded file outlives the
  // room itself. Tracked per browser, so the reminder follows whoever GMs.
  const [backupStamp, setBackupStamp] = useState(() =>
    lastBackupExportAt(OBR.room.id),
  )

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

  // The column lies over the sheet, and anything laid over the page has to
  // come off it the way everything else does.
  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  const active =
    entries.find((entry) => entry.profile.id === selectedId) ??
    entries.find((entry) => entry.profile.id === selfProfileId) ??
    entries[0]

  if (!active) {
    return (
      <main className="k-app-waiting">
        <p>{loaded ? 'Zakládám tvůj list…' : 'Připojuji se k místnosti…'}</p>
      </main>
    )
  }

  const armed = armedDeleteId === active.profile.id

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
    recordBackupExport(OBR.room.id)
    setBackupStamp(Date.now())
  }

  const daysSinceBackup = backupStamp
    ? (Date.now() - backupStamp) / 86_400_000
    : Infinity
  const backupOverdue = isGM && daysSinceBackup > BACKUP_NUDGE_DAYS

  // One stash per room: open it if it already exists, otherwise start it.
  const openStash = () => {
    const existing = entries.find(
      (entry) => entry.profile.character.kind === 'stash',
    )
    if (existing) {
      setSelectedId(existing.profile.id)
    } else {
      void addStashProfile().then((id) => id && setSelectedId(id))
    }
  }

  return (
    <div className="k-app" data-side={sidebarOpen}>
      {/* The page names itself by its layout; a screen reader needs it said. */}
      <h1 className="k-sr">Knave — deníky postav</h1>

      {sidebarOpen && (
        <aside
          className="k-app-side"
          id={SIDEBAR_ID}
          aria-label="Seznam deníků"
        >
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

      <main className="k-app-main">
        {/* The bar keeps its height while the column covers it, so opening the
            column never nudges the sheet. */}
        <div className="k-app-bar">
          {!sidebarOpen && (
            <button
              type="button"
              className="k-app-action k-side-toggle"
              aria-expanded={false}
              aria-controls={SIDEBAR_ID}
              onClick={toggleSidebar}
            >
              <IconList size={1.15} />
              deníky
            </button>
          )}

          {isGM && (
            <span className="k-app-bar-end">
              <button
                type="button"
                className="k-app-action"
                onClick={openStash}
                title="Otevřít sklad předmětů — jen pro GM"
              >
                <IconChest size={1.15} />
                Předměty
              </button>
              <button
                type="button"
                className="k-app-action"
                aria-pressed={active.profile.hidden}
                onClick={() => void toggleHidden(active.profile.id)}
                title={
                  active.profile.hidden
                    ? 'Odkrýt tento deník hráčům'
                    : 'Skrýt tento deník před hráči — zmizí ze seznamu, ale není to zámek na datech.'
                }
              >
                {active.profile.hidden ? (
                  <IconEyeOff size={1.15} />
                ) : (
                  <IconEye size={1.15} />
                )}
                {active.profile.hidden ? 'Skryto' : 'Viditelné'}
              </button>
            </span>
          )}
        </div>

        {backupOverdue && (
          <p className="k-app-notice" role="status">
            <span>
              {backupStamp
                ? 'Poslední záloha deníků je starší týdne. Místnost přežije restart, ale ne svoje smazání.'
                : 'Ještě sis nestáhl zálohu deníků. Místnost přežije restart, ale ne svoje smazání.'}
            </span>
            <button
              type="button"
              className="k-app-action"
              onClick={downloadBackup}
            >
              Stáhnout zálohu
            </button>
          </p>
        )}

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
                <IconClaim size={1.15} />
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
            {/* A deleted journal leaves the room and everyone else's screen at
                once, and nothing brings it back but a downloaded file. The
                first press only arms the button. */}
            {armed ? (
              <>
                <span className="k-app-confirm" role="alert">
                  Vymazat {active.displayName} nadobro?
                </span>
                <button
                  type="button"
                  className="k-app-action k-app-action-armed"
                  onClick={() => {
                    setArmedDeleteId('')
                    void deleteProfile(active.profile.id)
                  }}
                >
                  <IconTrash size={1.15} />
                  Ano, vymazat
                </button>
                <button
                  type="button"
                  className="k-app-action"
                  autoFocus
                  onClick={() => setArmedDeleteId('')}
                >
                  Zrušit
                </button>
              </>
            ) : (
              <button
                type="button"
                className="k-app-action k-app-action-warn"
                onClick={() => setArmedDeleteId(active.profile.id)}
              >
                <IconTrash size={1.15} />
                Vymazat
              </button>
            )}
          </span>
        </div>
      </main>
    </div>
  )
}

export default App
