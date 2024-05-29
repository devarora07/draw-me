import getStroke from 'perfect-freehand'
import { ElementType } from '../types'

const getSvgPathFromStroke = (stroke: [number, number][]) => {
  if (!stroke.length) return ''

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q']
  )

  d.push('Z')
  return d.join(' ')
}

export const drawElement = (
  roughCanvas: any,
  context: CanvasRenderingContext2D,
  element: ElementType
) => {
  switch (element.type) {
    case 'line':
    case 'rectangle':
      roughCanvas.draw(element.roughElement)
      break
    case 'pencil':
      if (!element.points) {
        throw new Error('Pencil element points are undefined')
      }
      const strokePoints = getStroke(element.points, { size: 2, thinning: 0 })
      const formattedPoints: [number, number][] = strokePoints.map((point) => {
        if (point.length !== 2) {
          throw new Error(
            `Expected point to have exactly 2 elements, got ${point.length}`
          )
        }
        return [point[0], point[1]]
      })
      const stroke = getSvgPathFromStroke(formattedPoints)
      context.fill(new Path2D(stroke))
      break
    case 'text':
      context.textBaseline = 'top'
      context.font = '24px sans-serif'
      const text = element.text || ''
      context.fillText(text, element.x1, element.y1)
      break
    default:
      throw new Error(`Type not recognised: ${element.type}`)
  }
}
