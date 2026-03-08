import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, onValue, onDisconnect, get } from 'firebase/database'
import { firebaseConfig } from './firebase-config'
import { Renderer } from './renderer'
import { nextHead, isOutOfBounds, collidesWithSnake, oppositeDir, newFood } from './game'
import type { GameState, PlayerState, Direction, Point } from './types'
import { TICK_MS, randomColor, randomPosition, generateId } from './types'

// ── Firebase ───────────────────────────────────────────────
const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

// ── State local ────────────────────────────────────────────
const myId = generateId()
let myColor = ''
let myName = ''
let gameState: GameState = { players: {}, food: { x: 5, y: 5 }, started: false }
let myBody: Point[] = []
let myDir: Direction = 'RIGHT'
let nextDir: Direction = 'RIGHT'
let myAlive = true
let myScore = 0
let tickInterval: ReturnType<typeof setInterval> | null = null
let renderLoop: number | null = null

// ── Renderer ───────────────────────────────────────────────
const canvas = document.createElement('canvas')
const renderer = new Renderer(canvas)

// ── Firebase refs ──────────────────────────────────────────
const myRef = ref(db, `players/${myId}`)
const foodRef = ref(db, 'food')
const playersRef = ref(db, 'players')

// ── Publish mon état dans Firebase (throttlé) ─────────────
let lastPublish = 0
function publishMe() {
  const now = Date.now()
  if (now - lastPublish < 80) return
  lastPublish = now
  set(myRef, {
    id: myId,
    name: myName,
    color: myColor,
    body: myBody,
    direction: myDir,
    alive: myAlive,
    score: myScore,
    lastUpdate: now,
  })
}

// ── Mon tick local ─────────────────────────────────────────
function startMyTick() {
  if (tickInterval) clearInterval(tickInterval)

  tickInterval = setInterval(() => {
    if (!myAlive) return

    myDir = nextDir
    const head = nextHead(myBody, myDir)

    // Collision mur
    if (isOutOfBounds(head)) {
      myAlive = false
      publishMe()
      setTimeout(() => respawn(), 3000)
      return
    }

    // Collision avec soi-même
    if (collidesWithSnake(head, myBody)) {
      myAlive = false
      publishMe()
      setTimeout(() => respawn(), 3000)
      return
    }

    // Collision avec les autres serpents
    for (const p of Object.values(gameState.players)) {
      if (p.id === myId || !p.alive) continue
      if (collidesWithSnake(head, p.body, false)) {
        myAlive = false
        publishMe()
        setTimeout(() => respawn(), 3000)
        return
      }
    }

    // Manger la nourriture
    const food = gameState.food
    const ateFood = head.x === food.x && head.y === food.y

    myBody = [head, ...myBody]
    if (!ateFood) {
      myBody.pop()
    } else {
      myScore++
      const allPts = Object.values(gameState.players).flatMap(p => p.body || [])
      set(foodRef, newFood([...allPts, ...myBody]))
    }

    publishMe()
  }, TICK_MS)
}

function respawn() {
  const occupied = Object.values(gameState.players).flatMap(p => p.body || [])
  const pos = randomPosition(occupied)
  myBody = [pos, { x: pos.x - 1, y: pos.y }, { x: pos.x - 2, y: pos.y }]
  myDir = 'RIGHT'
  nextDir = 'RIGHT'
  myAlive = true
  publishMe()
}

// ── Écouter les autres joueurs ─────────────────────────────
function startListening() {
  onValue(playersRef, (snap) => {
    gameState.players = snap.exists() ? snap.val() : {}
    updateScoreboard()
    showDeadOverlay(!myAlive)
  })

  onValue(foodRef, (snap) => {
    if (snap.exists()) gameState.food = snap.val()
  })
}

// ── UI ─────────────────────────────────────────────────────
function buildUI() {
  document.body.innerHTML = ''
  document.body.style.cssText = `
    margin:0;padding:0;background:#05050a;color:#eee;
    font-family:'Press Start 2P',monospace;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    min-height:100vh;gap:0;
  `
  const title = document.createElement('h1')
  title.textContent = '🐍 SNAKE.IO'
  title.style.cssText = `font-size:1.4rem;margin:0 0 4px;color:#00ff88;text-shadow:0 0 20px #00ff8888;letter-spacing:4px;`
  document.body.appendChild(title)

  const scoreBoard = document.createElement('div')
  scoreBoard.id = 'scoreboard'
  scoreBoard.style.cssText = `display:flex;gap:16px;flex-wrap:wrap;justify-content:center;margin-bottom:8px;min-height:22px;font-size:0.5rem;`
  document.body.appendChild(scoreBoard)

  const wrapper = document.createElement('div')
  wrapper.style.cssText = `border:2px solid #00ff8833;box-shadow:0 0 40px #00ff8822;position:relative;`
  canvas.style.display = 'block'
  wrapper.appendChild(canvas)

  const deadOverlay = document.createElement('div')
  deadOverlay.id = 'dead-overlay'
  deadOverlay.style.cssText = `display:none;position:absolute;inset:0;background:rgba(0,0,0,0.7);align-items:center;justify-content:center;flex-direction:column;gap:12px;font-size:0.6rem;`
  deadOverlay.innerHTML = `<div style="color:#ff4466;font-size:1rem">💀 MORT</div><div style="color:#aaa">Respawn dans 3s...</div>`
  wrapper.appendChild(deadOverlay)
  document.body.appendChild(wrapper)

  const hint = document.createElement('div')
  hint.style.cssText = `margin-top:8px;font-size:0.4rem;color:#444;text-align:center;line-height:2;`
  hint.innerHTML = '← ↑ ↓ → ou WASD &nbsp;|&nbsp; Mobile : swipe'
  document.body.appendChild(hint)

  setupInput()
  startRenderLoop()
}

function updateScoreboard() {
  const board = document.getElementById('scoreboard')
  if (!board) return
  const sorted = Object.values(gameState.players).sort((a, b) => b.score - a.score)
  board.innerHTML = sorted.map((p: PlayerState) =>
    `<span style="color:${p.color};opacity:${p.alive ? 1 : 0.4}">${p.alive ? '' : '💀 '}${p.name.slice(0, 8)}: ${p.score}</span>`
  ).join('')
}

function showDeadOverlay(show: boolean) {
  const el = document.getElementById('dead-overlay')
  if (el) el.style.display = show ? 'flex' : 'none'
}

// ── Login ──────────────────────────────────────────────────
function showLogin() {
  document.body.innerHTML = ''
  document.body.style.cssText = `
    margin:0;padding:0;background:#05050a;color:#eee;
    font-family:'Press Start 2P',monospace;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    min-height:100vh;gap:20px;
  `
  const title = document.createElement('h1')
  title.textContent = '🐍 SNAKE.IO'
  title.style.cssText = `font-size:1.8rem;margin:0;color:#00ff88;text-shadow:0 0 30px #00ff88;`

  const sub = document.createElement('p')
  sub.textContent = 'Multijoueur en temps réel'
  sub.style.cssText = 'color:#444;font-size:0.5rem;margin:0;'

  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = 'Ton pseudo...'
  input.maxLength = 10
  input.style.cssText = `background:#111;border:2px solid #00ff8844;color:#00ff88;font-family:'Press Start 2P',monospace;font-size:0.8rem;padding:12px 20px;outline:none;text-align:center;`
  input.onfocus = () => input.style.borderColor = '#00ff88'
  input.onblur = () => input.style.borderColor = '#00ff8844'

  const btn = document.createElement('button')
  btn.textContent = 'JOUER →'
  btn.style.cssText = `background:#00ff88;color:#000;border:none;font-family:'Press Start 2P',monospace;font-size:0.7rem;padding:14px 28px;cursor:pointer;box-shadow:0 0 20px #00ff8866;`

  const join = async () => {
    const name = input.value.trim() || 'Player'
    myName = name

    const snap = await get(playersRef)
    const existing = snap.exists() ? Object.values(snap.val() as Record<string, PlayerState>) : []
    myColor = randomColor(existing.map((p: PlayerState) => p.color))

    const occupied = existing.flatMap((p: PlayerState) => p.body || [])
    const pos = randomPosition(occupied)
    myBody = [pos, { x: pos.x - 1, y: pos.y }, { x: pos.x - 2, y: pos.y }]

    const foodSnap = await get(foodRef)
    if (!foodSnap.exists()) await set(foodRef, { x: 10, y: 10 })

    await set(myRef, {
      id: myId, name, color: myColor,
      body: myBody, direction: 'RIGHT',
      alive: true, score: 0, lastUpdate: Date.now(),
    })
    onDisconnect(myRef).remove()

    buildUI()
    startListening()
    startMyTick()
  }

  btn.onclick = join
  input.onkeydown = (e) => { if (e.key === 'Enter') join() }
  document.body.append(title, sub, input, btn)
  setTimeout(() => input.focus(), 100)
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
    if (!myAlive || oppositeDir(myDir, dir)) return
    nextDir = dir
  })

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
    if (!myAlive || oppositeDir(myDir, dir)) return
    nextDir = dir
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

// ── Cleanup ────────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
  if (tickInterval) clearInterval(tickInterval)
  if (renderLoop) cancelAnimationFrame(renderLoop)
})

// ── Start ──────────────────────────────────────────────────
showLogin()
