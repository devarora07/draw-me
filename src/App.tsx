import React, {
  MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import getStroke from 'perfect-freehand'
import rough from 'roughjs'
import {
  ElementType,
  ExtendedElementType,
  SelectedElementType,
  Tools,
  ToolsType,
} from './types'

const roughGenerator = rough.generator()

const createElement = (
  id: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: ToolsType
): ElementType => {
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

const positionWithinElement = (x: number, y: number, element: ElementType) => {
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

const getElementAtPosition = (
  x: number,
  y: number,
  elements: ElementType[]
) => {
  return elements
    .map((element) => ({
      ...element,
      position: positionWithinElement(x, y, element),
    }))
    .find((element) => element.position !== null)
}

const adjustElementCoordinates = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: ToolsType
) => {
  if (type === 'reactangle') {
    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2)
    const maxY = Math.max(y1, y2)
    return { x1: minX, y1: minY, x2: maxX, y2: maxY }
  } else {
    if (x1 < x2 || (x1 === x2 && y1 < y2)) {
      return { x1, y1, x2, y2 }
    } else {
      return { x1: x2, y1: y2, x2: x1, y2: y1 }
    }
  }
}

const cursorForPosition = (position: string) => {
  switch (position) {
    case 'topLeft':
    case 'bottomRight':
      return 'nwse-resize'
    case 'topRight':
    case 'bottomLeft':
      return 'nesw-resize'
    case 'start':
    case 'end':
      return 'move'
    case 'inside':
      return 'move'
    default:
      return 'default'
  }
}

const resizedCoordinates = (
  clientX: number,
  clientY: number,
  position: string,
  coordinates: { x1: number; y1: number; x2: number; y2: number }
) => {
  const { x1, y1, x2, y2 } = coordinates
  switch (position) {
    case 'topLeft':
    case 'start':
      return { x1: clientX, y1: clientY, x2, y2 }
    case 'topRight':
      return { x1, y1: clientY, x2: clientX, y2 }
    case 'bottomLeft':
      return { x1: clientX, y1, x2, y2: clientY }
    case 'bottomRight':
    case 'end':
      return { x1, y1, x2: clientX, y2: clientY }
    default:
      return coordinates
  }
}

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

const drawElement = (
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

const adjustmentRequired = (type: ToolsType) => {
  return ['line', 'rectangle'].includes(type)
}

const usePressedKeys = () => {
  const [pressedKeys, setPressedKeys] = useState(new Set())

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setPressedKeys((prevValue) => {
        const newPressValue = new Set(prevValue)
        newPressValue.add(event.key)
        return newPressValue
      })
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      setPressedKeys((prevValue) => {
        const newPressValue = new Set(prevValue)
        newPressValue.delete(event.key)
        return newPressValue
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return pressedKeys
}

const useHistory = (initialState: ElementType[]) => {
  const [index, setIndex] = useState(0)
  const [history, setHistory] = useState([initialState])

  const setState = (
    action: ElementType[] | ((current: ElementType[]) => ElementType[]),
    overwrite = false
  ) => {
    const newState =
      typeof action === 'function' ? action(history[index]) : action

    if (overwrite) {
      const historyCopy = [...history]
      historyCopy[index] = newState
      setHistory(historyCopy)
    } else {
      const prevState = [...history].slice(0, index + 1)
      setHistory([...prevState, newState])
      setIndex((index) => index + 1)
    }
  }

  const undo = () => index > 0 && setIndex((index) => index - 1)
  const redo = () => index < history.length && setIndex((index) => index + 1)

  return { elements: history[index], setElements: setState, undo, redo }
}

const App = () => {
  const { elements, setElements, undo, redo } = useHistory([])
  const [action, setAction] = useState('none')
  const [tool, setTool] = useState('rectangle')
  const [selectedElement, setSelectedElement] = useState<ElementType | null>()
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [startPanMousePosition, setStartPanMousePosition] = useState({
    x: 0,
    y: 0,
  })
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const pressedKeys = usePressedKeys()
  const [scale, setScale] = useState(1)
  const [scaleOffset, setScaleOffset] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    const canvas: HTMLCanvasElement = document.getElementById(
      'canvas'
    ) as HTMLCanvasElement
    const context = canvas.getContext('2d')
    if (context === null) return
    const roughCanvas = rough.canvas(canvas)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.save()

    context.translate(panOffset.x, panOffset.y)

    elements.forEach((element) => {
      if (
        action === 'writing' &&
        selectedElement &&
        selectedElement.id === element.id
      )
        return
      drawElement(roughCanvas, context, element)
    })

    context.restore()
  }, [elements, action, selectedElement, panOffset])

  useEffect(() => {
    const undoRedoFunction = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
        event.shiftKey ? redo() : undo()
      }
    }

    document.addEventListener('keydown', undoRedoFunction)
    return () => {
      document.removeEventListener('keydown', undoRedoFunction)
    }
  }, [undo, redo])

  useEffect(() => {
    const panFunction = (event: WheelEvent) => {
      setPanOffset((prevState) => ({
        x: prevState.x - event.deltaX,
        y: (prevState.y = event.deltaY),
      }))

      document.addEventListener('wheel', panFunction)
      return () => {
        document.removeEventListener('wheel', panFunction)
      }
    }
  }, [])

  useEffect(() => {
    const textArea = textAreaRef.current
    if (action === 'writing' && textArea && selectedElement) {
      setTimeout(() => {
        textArea.focus()
        textArea.value = selectedElement.text || ''
      }, 0)
    }
  }, [action, selectedElement])

  const updateElement = (
    id: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    type: ToolsType,
    options?: { text: string }
  ) => {
    const elementsCopy: ElementType[] = [...elements]

    switch (type) {
      case Tools.line:
      case Tools.rectangle:
        elementsCopy[id] = createElement(id, x1, y1, x2, y2, type)
        break
      case Tools.pencil:
        elementsCopy[id].points = [
          ...(elementsCopy[id].points || []),
          { x: x2, y: y2 },
        ]
        break
      case Tools.text:
        const canvas: HTMLCanvasElement = document.getElementById(
          'canvas'
        ) as HTMLCanvasElement

        const context = canvas.getContext('2d')

        if (!context) {
          throw new Error('Could not get 2D context from canvas')
        }
        if (!options) {
          throw new Error('No text options provided for text tool')
        }
        const textWidth = context.measureText(options.text).width

        const textHeight = 24
        elementsCopy[id] = {
          ...createElement(id, x1, y1, x1 + textWidth, y1 + textHeight, type),
          text: options.text,
        }
        break
      default:
        throw new Error(`Type not recognised: ${type}`)
    }
    setElements(elementsCopy, true)
  }

  const getMouseCoordinates = (event: MouseEvent) => {
    const clientX = event.clientX - panOffset.x
    const clientY = event.clientY - panOffset.y

    return { clientX, clientY }
  }

  const handleMouseDown = (event: MouseEvent<HTMLCanvasElement>) => {
    if (action === 'writing') return

    const { clientX, clientY } = getMouseCoordinates(event)
    if (event.button === 1 || pressedKeys.has(' ')) {
      setAction('panning')
      setStartPanMousePosition({ x: clientX, y: clientY })
    }

    if (tool === Tools.selection) {
      const element = getElementAtPosition(clientX, clientY, elements)
      if (element) {
        let selectedElement: SelectedElementType = { ...element }
        if (element.type === 'pencil' && element.points) {
          const xOffsets = element.points.map((point) => clientX - point.x)
          const yOffsets = element.points.map((point) => clientY - point.y)
          selectedElement = { ...element, xOffsets, yOffsets }
        } else {
          const offsetX = clientX - element.x1
          const offsetY = clientY - element.y1
          selectedElement = { ...element, offsetX, offsetY }
        }
        setSelectedElement(selectedElement)
        setElements((prevState) => prevState)

        if (element.position === 'inside') {
          setAction('moving')
        } else {
          setAction('resizing')
        }
      }
    } else {
      const id = elements.length
      const element = createElement(
        id,
        clientX,
        clientY,
        clientX,
        clientY,
        tool
      )
      setElements((prevState) => [...prevState, element])
      setSelectedElement(element)
      setAction(tool === 'text' ? 'writing' : 'drawing')
    }
  }
  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = getMouseCoordinates(event)
    if (action === 'panning') {
      const deltaX = clientX - startPanMousePosition.x
      const deltaY = clientY - startPanMousePosition.y
      setPanOffset({
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY,
      })
      return
    }
    if (tool === 'selection') {
      const element = getElementAtPosition(clientX, clientY, elements)
      if (element && element.position) {
        ;(event.target as HTMLElement).style.cursor = cursorForPosition(
          element.position
        )
      } else {
        ;(event.target as HTMLElement).style.cursor = 'default'
      }
    }
    if (action === 'drawing') {
      const index = elements.length - 1
      const { x1, y1 } = elements[index]
      updateElement(index, x1, y1, clientX, clientY, tool)
    } else if (action === 'moving' && selectedElement) {
      if (
        selectedElement.type === 'pencil' &&
        'points' in selectedElement &&
        'xOffsets' in selectedElement &&
        'yOffsets' in selectedElement
      ) {
        const extendedElement = selectedElement as ExtendedElementType
        const newPoints = extendedElement.points!.map((_, index) => ({
          x: clientX - extendedElement.xOffsets![index],
          y: clientY - extendedElement.yOffsets![index],
        }))
        const elementsCopy = [...elements]
        elementsCopy[selectedElement.id] = {
          ...elementsCopy[selectedElement.id],
          points: newPoints,
        }
        setElements(elementsCopy, true)
      } else {
        const { id, x1, x2, y1, y2, type, offsetX, offsetY } =
          selectedElement as ExtendedElementType
        const width = x2 - x1
        const height = y2 - y1
        const newX1 = clientX - (offsetX ?? 0)
        const newY1 = clientY - (offsetY ?? 0)
        const options =
          type === 'text' && selectedElement.text
            ? { text: selectedElement.text }
            : undefined
        updateElement(
          id,
          newX1,
          newY1,
          newX1 + width,
          newY1 + height,
          type,
          options
        )
      }
    } else if (
      action === 'resizing' &&
      selectedElement &&
      selectedElement.position
    ) {
      const { id, type, position, ...coordinates } =
        selectedElement as ExtendedElementType
      if (typeof position === 'string') {
        const { x1, y1, x2, y2 } = resizedCoordinates(
          clientX,
          clientY,
          position,
          coordinates
        )
        updateElement(id, x1, y1, x2, y2, type)
      }
    }
  }
  const handleMouseUp = (event: MouseEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = getMouseCoordinates(event)
    if (selectedElement) {
      if (
        selectedElement.type === 'text' &&
        selectedElement.offsetX &&
        selectedElement.offsetY &&
        clientX - selectedElement.offsetX === selectedElement.x1 &&
        clientY - selectedElement.offsetY === selectedElement.y1
      ) {
        setAction('writing')
        return
      }

      const index = selectedElement.id
      const { id, type } = elements[index]
      if (
        (action === 'drawing' || action === 'resizing') &&
        adjustmentRequired(type)
      ) {
        const { x1, y1, x2, y2 } = adjustElementCoordinates(
          elements[index].x1,
          elements[index].y1,
          elements[index].x2,
          elements[index].y2,
          elements[index].type
        )
        updateElement(id, x1, y1, x2, y2, type)
      }
    }

    if (action === 'writing') return
    setAction('none')
    setSelectedElement(null)
  }
  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    if (selectedElement) {
      const { id, x1, y1, type } = selectedElement
      const x2 = selectedElement.x2 || x1
      const y2 = selectedElement.y2 || y1
      setAction('none')
      setSelectedElement(null)
      updateElement(id, x1, y1, x2, y2, type, { text: event.target.value })
    } else {
      console.error('No element selected when handleBlur was called')
    }
  }

  return (
    <div>
      <div style={{ position: 'fixed', zIndex: 2 }}>
        <input
          type="radio"
          id="selection"
          checked={tool === 'selection'}
          onChange={() => setTool('selection')}
        />
        <label htmlFor="selection">Selection</label>

        <input
          type={'radio'}
          id="line"
          checked={tool === 'line'}
          onChange={() => setTool('line')}
        />
        <label htmlFor="line">Line</label>

        <input
          type={'radio'}
          id="rectangle"
          checked={tool === 'rectangle'}
          onChange={() => setTool('rectangle')}
        />

        <label htmlFor="rectangle">Rectangle</label>

        <input
          type={'radio'}
          id="pencil"
          checked={tool === 'pencil'}
          onChange={() => setTool('pencil')}
        />
        <label htmlFor="pencil">Pencil</label>

        <input
          type={'radio'}
          id="text"
          checked={tool === 'text'}
          onChange={() => setTool('text')}
        />
        <label htmlFor="text">Text</label>
      </div>
      <div style={{ position: 'fixed', zIndex: 2, bottom: 0, padding: 10 }}>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
      </div>
      {action === 'writing' ? (
        <textarea
          ref={textAreaRef}
          onBlur={handleBlur}
          style={{
            position: 'fixed',
            top: selectedElement
              ? (selectedElement.y1 - 2) * scale +
                panOffset.y * scale -
                scaleOffset.y
              : 0,
            left: selectedElement
              ? selectedElement.x1 * scale + panOffset.x * scale - scaleOffset.x
              : 0,
            font: `${24 * scale}px sans-serif`,

            margin: 0,
            padding: 0,
            border: 0,
            outline: 0,
            // resize: 'auto',
            overflow: 'hidden',
            whiteSpace: 'pre',
            background: 'transparent',
            zIndex: 2,
          }}
        />
      ) : null}
      <canvas
        id="canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ position: 'absolute', zIndex: 1 }}
      >
        Canvas
      </canvas>
    </div>
  )
}

export default App
