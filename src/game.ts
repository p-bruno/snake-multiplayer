import type { Direction, PlayerState, Point, FoodState } from './types'
import { GRID_SIZE, randomPosition } from './types'

export function nextHead(body: Point[], dir: Direction): Point {
  const head = body[0]
  switch (dir) {
    case 'UP':    return { x: head.x, y: head.y - 1 }
    case 'DOWN':  return { x: head.x, y: head.y + 1 }
    case 'LEFT':  return { x: head.x - 1, y: head.y }
    case 'RIGHT': return { x: head.x + 1, y: head.y }
  }
}

export function isOutOfBounds(p: Point): boolean {
  return p.x < 0 || p.x >= GRID_SIZE || p.y < 0 || p.y >= GRID_SIZE
}

export function collidesWithSnake(p: Point, body: Point[], skipTail = true): boolean {
  const check = skipTail ? body.slice(0, -1) : body
  return check.some(s => s.x === p.x && s.y === p.y)
}

export function oppositeDir(a: Direction, b: Direction): boolean {
  return (a === 'UP' && b === 'DOWN') ||
         (a === 'DOWN' && b === 'UP') ||
         (a === 'LEFT' && b === 'RIGHT') ||
         (a === 'RIGHT' && b === 'LEFT')
}

export function tickPlayer(
  player: PlayerState,
  food: FoodState,
  allBodies: Point[][]
): { player: PlayerState; ateFood: boolean } {
  if (!player.alive) return { player, ateFood: false }

  const head = nextHead(player.body, player.direction)
  let alive = true
  let ateFood = false

  if (isOutOfBounds(head)) alive = false

  // Self collision
  if (alive && collidesWithSnake(head, player.body)) alive = false

  // Other snakes collision
  if (alive) {
    for (const body of allBodies) {
      if (collidesWithSnake(head, body, false)) {
        alive = false
        break
      }
    }
  }

  if (!alive) {
    return { player: { ...player, alive: false }, ateFood: false }
  }

  // Check food
  ateFood = head.x === food.x && head.y === food.y

  const newBody = [head, ...player.body]
  if (!ateFood) newBody.pop()

  return {
    player: {
      ...player,
      body: newBody,
      score: player.score + (ateFood ? 1 : 0),
      alive: true,
    },
    ateFood,
  }
}

export function newFood(exclude: Point[]): FoodState {
  return randomPosition(exclude)
}

export function initialSnake(pos: Point): Point[] {
  return [
    pos,
    { x: pos.x - 1, y: pos.y },
    { x: pos.x - 2, y: pos.y },
  ]
}
