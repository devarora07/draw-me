import React, {
  MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import rough from 'roughjs'
import {
  ElementType,
  ExtendedElementType,
  SelectedElementType,
  Tools,
  ToolsType,
} from './types'
import { useHistory } from './hooks/useHistory'
import { usePressedKeys } from './hooks/usePressedKeys'
import {
  drawElement,
  createElement,
  getElementAtPosition,
  cursorForPosition,
  resizedCoordinates,
  adjustmentRequired,
  adjustElementCoordinates,
} from './utils'
import { ActionBar } from './components/ActionBar/actionBar'
import { ControlPanel } from './components/control-panel/control-panel'

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
    const scaledWidth = canvas.width * scale
    const scaledHeight = canvas.height * scale
    const scaleOffsetX = (scaledWidth - canvas.width) / 2
    const scaleOffsetY = (scaledHeight - canvas.height) / 2
    setScaleOffset({ x: scaleOffsetX, y: scaleOffsetY })

    context.save()

    context.translate(
      panOffset.x * scale - scaleOffsetX,
      panOffset.y * scale - scaleOffsetY
    )
    context.scale(scale, scale)

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
  }, [elements, action, selectedElement, panOffset, scale])

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

    if (tool === Tools.pan || event.button === 1 || pressedKeys.has(' ')) {
      setAction('panning')
      setStartPanMousePosition({ x: clientX, y: clientY })
      document.body.style.cursor = 'grabbing'
      return
    }

    // if (event.button === 1 || pressedKeys.has(' ')) {
    //   setAction('panning')
    //   setStartPanMousePosition({ x: clientX, y: clientY })
    //   document.body.style.cursor = 'grabbing'
    // }

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

    if (action === 'panning') {
      document.body.style.cursor = 'default'
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

  const onZoom = (delta: number) => {
    setScale((prevState) => Math.min(Math.max(prevState + delta, 0.1), 20))
  }

  return (
    <div>
      <ActionBar tool={tool} setTool={setTool} />

      <ControlPanel
        undo={undo}
        redo={redo}
        onZoom={onZoom}
        scale={scale}
        setScale={setScale}
      />
      {action === 'writing' ? (
        <textarea
          ref={textAreaRef}
          onBlur={handleBlur}
          style={{
            top: selectedElement
              ? (selectedElement.y1 - 2) * scale +
                panOffset.y * scale -
                scaleOffset.y
              : 0,
            left: selectedElement
              ? selectedElement.x1 * scale + panOffset.x * scale - scaleOffset.x
              : 0,
            font: `${24 * scale}px sans-serif`,
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
      />
    </div>
  )
}

export default App
