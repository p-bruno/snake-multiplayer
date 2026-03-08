export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export interface Point {
  x: number
  y: number
}

export interface PlayerState {
  id: string
  name: string
  color: string
  body: Point[]
  direction: Direction
  alive: boolean
  score: number
  lastUpdate: number
}

export interface FoodState {
  x: number
  y: number
}

export interface GameState {
  players: Record<string, PlayerState>
  food: FoodState
  started: boolean
}

export const GRID_SIZE = 20      // nombre de cases
export const CELL_SIZE = 24      // pixels par case
export const TICK_MS = 120       // vitesse du jeu (ms entre chaque tick)

export const PLAYER_COLORS = [
  '#00ff88', // vert néon
  '#ff4466', // rouge/rose
  '#44aaff', // bleu
  '#ffcc00', // jaune
  '#ff8800', // orange
  '#cc44ff', // violet
  '#00ffee', // cyan
  '#ff44aa', // rose
]

export function randomColor(existingColors: string[]): string {
  const available = PLAYER_COLORS.filter(c => !existingColors.includes(c))
  if (available.length === 0) return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]
  return available[Math.floor(Math.random() * available.length)]
}

export function randomPosition(exclude: Point[] = []): Point {
  let pos: Point
  do {
    pos = {
      x: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
      y: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
    }
  } while (exclude.some(p => p.x === pos.x && p.y === pos.y))
  return pos
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}
