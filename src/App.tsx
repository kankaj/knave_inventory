import { useEffect, useState } from 'react'
import OBR from '@owlbear-rodeo/sdk'
import './App.css'

function App() {
  const [ready, setReady] = useState(false)
  const [playerName, setPlayerName] = useState('')

  useEffect(() => {
    // OBR.onReady fires once the SDK has connected to the parent Owlbear
    // Rodeo window. Any other SDK call before this point will fail.
    return OBR.onReady(async () => {
      setReady(true)
      setPlayerName(await OBR.player.getName())
    })
  }, [])

  if (!ready) {
    return (
      <main>
        <p className="hint">
          Waiting for Owlbear Rodeo. Open this extension from a room to
          connect.
        </p>
      </main>
    )
  }

  return (
    <main>
      <h1>Knave Inventory</h1>
      <p>Connected as {playerName}.</p>
      <button
        type="button"
        onClick={() => OBR.notification.show('Knave Inventory is alive')}
      >
        Send test notification
      </button>
    </main>
  )
}

export default App
