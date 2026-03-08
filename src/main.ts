import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, onValue, remove, onDisconnect, get } from 'firebase/database'
import { firebaseConfig } from './firebase-config'
import { Renderer } from './renderer'
import { tickPlayer, newFood, initialSnake, oppositeDir } from './game'
import type { GameState, PlayerState, Direction } from './types'
import {
  GRID_SIZE, CELL_SIZE, TICK_MS,
  randomColor, randomPosition, generateId
} from './types'

// ── Firebase init ──────────────────────────────────────────
const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

// ── State ──────────────────────────────────────────────────
const myId = generateId()
let myName = ''
let myColor = ''
let gameState: GameState = { players: {}, food: { x: 5, y: 5 }, started: false }
let myDirection: Direction = 'RIGHT'
let pendingDir: Direction | null = null
let isHost = false
let tickInterval: ReturnType<typeof setInterval> | null = null
let renderLoop: number | null = null

// ── DOM ────────────────────────────────────────────────────
const canvas = document.createElement('canvas')
const renderer = new Renderer(canvas)

function buildUI() {
  document.body.innerHTML = ''
  document.body.style.cssText = `
    margin: 0; padding: 0;
    background: #05050a;
    color: #eee;
    font-family: 'Press Start 2P', monospace;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 100vh;
    gap: 0;
  `

  // Title
  const title = document.createElement('h1')
  title.textContent = '🐍 SNAKE.IO'
  title.style.cssText = `
    font-size: 1.4rem; margin: 0 0 4px 0;
    color: #00ff88;
    text-shadow: 0 0 20px #00ff8888;
    letter-spacing: 4px;
  `
  document.body.appendChild(title)

  // Scoreboard
  const scoreBoard = document.createElement('div')
  scoreBoard.id = 'scoreboard'
  scoreBoard.style.cssText = `
    display: flex; gap: 16px; flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 8px;
    min-height: 22px;
    font-size: 0.5rem;
  `
  document.body.appendChild(scoreBoard)

  // Canvas wrapper
  const wrapper = document.createElement('div')
  wrapper.style.cssText = `
    border: 2px solid #00ff8833;
    box-shadow: 0 0 40px #00ff8822;
    position: relative;
  `
  canvas.style.display = 'block'
  wrapper.appendChild(canvas)

  // Dead overlay
  const deadOverlay = document.createElement('div')
  deadOverlay.id = 'dead-overlay'
  deadOverlay.style.cssText = `
    display: none; position: absolute; inset: 0;
    background: rgba(0,0,0,0.7);
    align-items: center; justify-content: center;
    flex-direction: column; gap: 12px;
    font-size: 0.6rem;
  `
  deadOverlay.innerHTML = `
    <div style="color:#ff4466;font-size:1rem">💀 MORT</div>
    <div style="color:#aaa">Tu respawnes dans 3s...</div>
  `
  wrapper.appendChild(deadOverlay)
  document.body.appendChild(wrapper)

  // Controls hint
  const hint = document.createElement('div')
  hint.style.cssText = `
    margin-top: 8px; font-size: 0.4rem;
    color: #444; text-align: center; line-height: 2;
  `
  hint.innerHTML = '← ↑ ↓ → ou WASD &nbsp;|&nbsp; Mobile : swipe'
  document.body.appendChild(hint)
}

function updateScoreboard() {
  const board = document.getElementById('scoreboard')
  if (!board) return
  const sorted = Object.values(gameState.players).sort((a, b) => b.score - a.score)
  board.innerHTML = sorted.map(p => `
    <span style="color:${p.color}; opacity:${p.alive ? 1 : 0.4}">
      ${p.alive ? '' : '💀 '}${p.name.slice(0, 8)}: ${p.score}
    </span>
  `).join('')
}

function showDeadOverlay(show: boolean) {
  const el = document.getElementById('dead-overlay')
  if (el) el.style.display = show ? 'flex' : 'none'
}

// ── Login screen ───────────────────────────────────────────
function showLogin() {
  document.body.innerHTML = ''
  document.body.style.cssText = `
    margin: 0; padding: 0;
    background: #05050a;
    color: #eee;
    font-family: 'Press Start 2P', monospace;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 100vh; gap: 20px;
  `

  const title = document.createElement('h1')
  title.textContent = '🐍 SNAKE.IO'
  title.style.cssText = `
    font-size: 1.8rem; margin: 0;
    color: #00ff88;
    text-shadow: 0 0 30px #00ff88;
  `

  const sub = document.createElement('p')
  sub.textContent = 'Multijoueur en temps réel'
  sub.style.cssText = 'color:#444; font-size:0.5rem; margin:0;'

  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = 'Ton pseudo...'
  input.maxLength = 10
  input.style.cssText = `
    background: #111; border: 2px solid #00ff8844;
    color: #00ff88; font-family: 'Press Start 2P', monospace;
    font-size: 0.8rem; padding: 12px 20px;
    outline: none; text-align: center;
    transition: border-color 0.2s;
  `
  input.onfocus = () => input.style.borderColor = '#00ff88'
  input.onblur = () => input.style.borderColor = '#00ff8844'

  const btn = document.createElement('button')
  btn.textContent = 'JOUER →'
  btn.style.cssText = `
    background: #00ff88; color: #000;
    border: none; font-family: 'Press Start 2P', monospace;
    font-size: 0.7rem; padding: 14px 28px;
    cursor: pointer; transition: transform 0.1s, box-shadow 0.2s;
    box-shadow: 0 0 20px #00ff8866;
  `
  btn.onmouseenter = () => { btn.style.transform = 'scale(1.05)'; btn.style.boxShadow = '0 0 40px #00ff88aa' }
  btn.onmouseleave = () => { btn.style.transform = ''; btn.style.boxShadow = '0 0 20px #00ff8866' }

  const join = () => {
    const name = input.value.trim() || 'Player'
    joinGame(name)
  }

  btn.onclick = join
  input.onkeydown = (e) => { if (e.key === 'Enter') join() }

  document.body.append(title, sub, input, btn)
  setTimeout(() => input.focus(), 100)
}

// ── Firebase sync ──────────────────────────────────────────
async function joinGame(name: string) {
  myName = name

  // Pick color not taken
  const snap = await get(ref(db, 'players'))
  const existing = snap.exists() ? Object.values(snap.val() as Record<string, PlayerState>) : []
  const takenColors = existing.map(p => p.color)
  myColor = randomColor(takenColors)

  // Spawn position
  const allBodies = existing.flatMap(p => p.body || [])
  const pos = randomPosition(allBodies)

  const me: PlayerState = {
    id: myId,
    name,
    color: myColor,
    body: initialSnake(pos),
    direction: 'RIGHT',
    alive: true,
    score: 0,
    lastUpdate: Date.now(),
  }

  const playerRef = ref(db, `players/${myId}`)
  await set(playerRef, me)
  onDisconnect(playerRef).remove()

  // Check if food exists
  const foodSnap = await get(ref(db, 'food'))
  if (!foodSnap.exists()) {
    await set(ref(db, 'food'), { x: 10, y: 10 })
  }

  buildUI()
  startListening()
  startRenderLoop()
  setupInput()
  electHost()
}

function startListening() {
  onValue(ref(db, 'players'), (snap) => {
    gameState.players = snap.exists() ? snap.val() : {}
    updateScoreboard()

    const me = gameState.players[myId]
    if (me) showDeadOverlay(!me.alive)
  })

  onValue(ref(db, 'food'), (snap) => {
    if (snap.exists()) gameState.food = snap.val()
  })
}

// ── Host election : le joueur avec le plus petit ID tick le jeu ──
function electHost() {
  onValue(ref(db, 'players'), (snap) => {
    if (!snap.exists()) return
    const ids = Object.keys(snap.val() as Record<string, PlayerState>).sort()
    const shouldBeHost = ids[0] === myId

    if (shouldBeHost && !isHost) {
      isHost = true
      startTicking()
    } else if (!shouldBeHost && isHost) {
      isHost = false
      if (tickInterval) clearInterval(tickInterval)
      tickInterval = null
    }
  })
}

// ── Game tick (only host runs this) ───────────────────────
function startTicking() {
  if (tickInterval) clearInterval(tickInterval)

  tickInterval = setInterval(async () => {
    const playersSnap = await get(ref(db, 'players'))
    const foodSnap = await get(ref(db, 'food'))
    if (!playersSnap.exists() || !foodSnap.exists()) return

    const players: Record<string, PlayerState> = playersSnap.val()
    let food: { x: number; y: number } = foodSnap.val()

    const allBodies = Object.values(players)
      .filter(p => p.alive)
      .map(p => p.body)

    let foodEaten = false
    const updates: Record<string, PlayerState> = {}

    for (const [id, player] of Object.entries(players)) {
      if (!player.alive) {
        // Auto-respawn after 3s
        if (Date.now() - player.lastUpdate > 3000) {
          const occupied = Object.values(players).flatMap(p => p.body || [])
          const pos = randomPosition(occupied)
          updates[id] = {
            ...player,
            body: initialSnake(pos),
            direction: 'RIGHT',
            alive: true,
            lastUpdate: Date.now(),
          }
        } else {
          updates[id] = player
        }
        continue
      }

      const otherBodies = allBodies.filter((_, i) =>
        Object.keys(players).filter(k => players[k].alive)[i] !== id
      )

      const { player: updated, ateFood } = tickPlayer(player, food, otherBodies)
      if (ateFood) foodEaten = true
      updates[id] = { ...updated, lastUpdate: Date.now() }
    }

    // New food if eaten
    if (foodEaten) {
      const allPts = Object.values(updates).flatMap(p => p.body || [])
      food = newFood(allPts)
      await set(ref(db, 'food'), food)
    }

    await set(ref(db, 'players'), updates)
  }, TICK_MS)
}

// ── Input ──────────────────────────────────────────────────
function setupInput() {
  const dirMap: Record<string, Direction> = {
    ArrowUp: 'UP', w: 'UP', W: 'UP',
    ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
    ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
    ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
  }

  window.addEventListener('keydown', (e) => {
    const dir = dirMap[e.key]
    if (!dir) return
    e.preventDefault()

    const me = gameState.players[myId]
    if (!me || !me.alive) return
    if (oppositeDir(me.direction, dir)) return

    myDirection = dir
    // Push direction to Firebase immediately
    set(ref(db, `players/${myId}/direction`), dir)
  })

  // Touch / swipe support
  let touchStart: { x: number; y: number } | null = null
  canvas.addEventListener('touchstart', (e) => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  })
  canvas.addEventListener('touchend', (e) => {
    if (!touchStart) return
    const dx = e.changedTouches[0].clientX - touchStart.x
    const dy = e.changedTouches[0].clientY - touchStart.y
    touchStart = null
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return

    let dir: Direction
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'RIGHT' : 'LEFT'
    else dir = dy > 0 ? 'DOWN' : 'UP'

    const me = gameState.players[myId]
    if (!me || !me.alive || oppositeDir(me.direction, dir)) return
    set(ref(db, `players/${myId}/direction`), dir)
  })
}

// ── Render loop ────────────────────────────────────────────
function startRenderLoop() {
  const loop = () => {
    renderer.render(gameState, myId)
    renderLoop = requestAnimationFrame(loop)
  }
  renderLoop = requestAnimationFrame(loop)
}

// ── Cleanup on close ───────────────────────────────────────
window.addEventListener('beforeunload', () => {
  remove(ref(db, `players/${myId}`))
  if (tickInterval) clearInterval(tickInterval)
})

// ── Start ──────────────────────────────────────────────────
showLogin()
