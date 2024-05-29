import rough from 'roughjs'
import { Tools, ToolsType, ElementType } from '../types'

export const createElement = (
  id: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: ToolsType
): ElementType => {
  const roughGenerator = rough.generator()
  let roughElement = null
  switch (type) {
    case Tools.line:
      roughElement = roughGenerator.line(x1, y1, x2, y2)
      return { id, x1, y1, x2, y2, type, roughElement }
    case Tools.rectangle:
      roughElement = roughGenerator.rectangle(x1, y1, x2 - x1, y2 - y1)
      return { id, x1, y1, x2, y2, type, roughElement }
    case Tools.pencil:
      return {
        id,
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        type,
        points: [{ x: x1, y: y1 }],
        roughElement,
      }
    case Tools.text:
      return { id, type, x1, y1, x2, y2, text: '' }
    default:
      throw new Error(`Type not recognized: ${type}`)
  }
}
