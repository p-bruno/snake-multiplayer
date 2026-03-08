import type { GameState, PlayerState } from './types'
import { GRID_SIZE, CELL_SIZE } from './types'

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.canvas.width = GRID_SIZE * CELL_SIZE
    this.canvas.height = GRID_SIZE * CELL_SIZE
    this.ctx = canvas.getContext('2d')!
  }

  render(state: GameState, myId: string) {
    const { ctx } = this
    const W = this.canvas.width
    const H = this.canvas.height

    // Background
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL_SIZE, 0)
      ctx.lineTo(i * CELL_SIZE, H)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * CELL_SIZE)
      ctx.lineTo(W, i * CELL_SIZE)
      ctx.stroke()
    }

    // Food
    if (state.food) {
      const fx = state.food.x * CELL_SIZE
      const fy = state.food.y * CELL_SIZE
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200)
      ctx.shadowBlur = 20 * pulse
      ctx.shadowColor = '#ff4444'
      ctx.fillStyle = '#ff4444'
      const r = (CELL_SIZE / 2 - 2) * pulse
      ctx.beginPath()
      ctx.arc(fx + CELL_SIZE / 2, fy + CELL_SIZE / 2, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Snakes
    for (const player of Object.values(state.players)) {
      this.renderSnake(player, player.id === myId)
    }
  }

  private renderSnake(player: PlayerState, isMe: boolean) {
    const { ctx } = this
    if (!player.body || player.body.length === 0) return

    const color = player.color
    const alpha = player.alive ? 1 : 0.3

    player.body.forEach((seg, i) => {
      const x = seg.x * CELL_SIZE
      const y = seg.y * CELL_SIZE
      const isHead = i === 0
      const t = 1 - i / player.body.length

      ctx.globalAlpha = alpha * (0.4 + 0.6 * t)

      if (isHead) {
        // Glow on head
        ctx.shadowBlur = isMe ? 20 : 10
        ctx.shadowColor = color
      } else {
        ctx.shadowBlur = 0
      }

      const pad = isHead ? 1 : 2
      const radius = isHead ? 5 : 3

      ctx.fillStyle = color
      this.roundRect(x + pad, y + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2, radius)
      ctx.fill()

      // Eyes on head
      if (isHead && player.alive) {
        ctx.shadowBlur = 0
        ctx.fillStyle = '#000'
        ctx.globalAlpha = alpha
        const ex = x + CELL_SIZE / 2
        const ey = y + CELL_SIZE / 2
        ctx.beginPath()
        ctx.arc(ex - 3, ey - 2, 2, 0, Math.PI * 2)
        ctx.arc(ex + 3, ey - 2, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    ctx.globalAlpha = 1
    ctx.shadowBlur = 0

    // Name tag
    if (player.body[0]) {
      const head = player.body[0]
      ctx.font = '7px "Press Start 2P"'
      ctx.fillStyle = color
      ctx.globalAlpha = 0.9
      ctx.textAlign = 'center'
      const tx = head.x * CELL_SIZE + CELL_SIZE / 2
      const ty = head.y * CELL_SIZE - 5
      ctx.fillText(player.name.slice(0, 8), tx, ty)
      ctx.globalAlpha = 1
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const { ctx } = this
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
}
