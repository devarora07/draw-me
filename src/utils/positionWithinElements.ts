import { ElementType } from '../types'

const nearPoints = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  name: string
) => {
  return Math.abs(x1 - x2) < 20 && Math.abs(y1 - y2) < 20 ? name : null
}

const distance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2))
}

const onLine = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number,
  maxDistance: number = 1
) => {
  const offset =
    distance(x1, y1, x2, y2) - (distance(x1, y1, x, y) + distance(x2, y2, x, y))
  return Math.abs(offset) < maxDistance ? 'inside' : null
}

export const positionWithinElement = (
  x: number,
  y: number,
  element: ElementType
) => {
  const { type, x1, y1, x2, y2 } = element
  switch (type) {
    case 'line': {
      const on = onLine(x1, y1, x2, y2, x, y, 5)
      const start = nearPoints(x1, y1, x, y, 'start')
      const end = nearPoints(x2, y2, x, y, 'end')
      return on || start || end
    }
    case 'rectangle': {
      const topLeft = nearPoints(x1, y1, x, y, 'topLeft')
      const topRight = nearPoints(x2, y1, x, y, 'topRight')
      const bottomLeft = nearPoints(x1, y2, x, y, 'bottomLeft')
      const bottomRight = nearPoints(x2, y2, x, y, 'bottomRight')
      const inside = x1 <= x && x2 >= x && y1 <= y && y2 >= y ? 'inside' : null
      return inside || topLeft || topRight || bottomLeft || bottomRight
    }
    case 'pencil': {
      const betweenAnyPoints = element.points!.some((point, index) => {
        const nextPoint = element.points![index + 1]
        if (!nextPoint) return false
        return (
          onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y, 5) !== null
        )
      })
      return betweenAnyPoints ? 'inside' : null
    }
    case 'text':
      return x1 <= x && x2 >= x && y1 <= y && y2 >= y ? 'inside' : null
    default:
      throw new Error(`Type not recognised: ${type}`)
  }
}
