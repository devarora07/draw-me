import { MouseEvent, useLayoutEffect, useState } from 'react'
import rough from 'roughjs'

type ElementType = {
  x1: number
  y1: number
  x2: number
  y2: number
  roughElement: any
}

export default function App() {
  const [elements, setElements] = useState<ElementType[]>([])
  const [drawing, setDrawing] = useState(false)
  const [elementType, setElementType] = useState<
    'line' | 'rectangle' | 'circle'
  >('line')

  const generator = rough.generator()

  const createElement = (
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): ElementType => {
    const roughEle = elementType
      ? generator.line(x1, y1, x2, y2)
      : generator.rectangle(x1, y1, x2 - x1, y2 - y1)
    // generator.circle(x1, y1)

    const roughElement = (() => {
      switch (elementType) {
        case 'line':
          return generator.line(x1, y1, x2, y2)
        case 'rectangle':
          return generator.rectangle(x1, y1, x2 - x1, y2 - y1)
        case 'circle':
          return generator.circle(
            x2,
            y2,
            Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 2
          )
      }
    })()

    return { x1, y1, x2, y2, roughElement }
  }

  useLayoutEffect(() => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement
    const context = canvas.getContext('2d') as CanvasRenderingContext2D
    context.clearRect(0, 0, canvas.width, canvas.height)

    const roughCanvas = rough.canvas(canvas)

    elements.forEach(({ roughElement }) => {
      roughCanvas.draw(roughElement)
    })
  }, [elements])

  const handleMouseDown = (event: MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true)
    const { clientX, clientY } = event
    const element = createElement(clientX, clientY, clientX, clientY)
    setElements((prevState) => [...prevState, element])
  }

  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) {
      return
    }

    const index = elements.length - 1
    const { clientX, clientY } = event
    const { x1, y1 } = elements[index]
    const updateElement = createElement(x1, y1, clientX, clientY)

    const elementsCopy = [...elements]
    elementsCopy[index] = updateElement
    setElements(elementsCopy)
  }

  const handleMouseUp = () => {
    setDrawing(false)
  }

  return (
    <div>
      <div style={{ position: 'fixed' }}>
        <input
          type="radio"
          name="line"
          id="line"
          checked={elementType === 'line'}
          onChange={() => setElementType('line')}
        />
        <label htmlFor="line">line</label>

        <input
          type="radio"
          name="rectangle"
          id="rectangle"
          checked={elementType === 'rectangle'}
          onChange={() => setElementType('rectangle')}
        />

        <label htmlFor="rectangle">rectangle</label>

        <input
          type="radio"
          name="circle"
          id="circle"
          checked={elementType === 'circle'}
          onChange={() => setElementType('circle')}
        />

        <label htmlFor="circle">circle</label>
      </div>
      <canvas
        id="canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        Canvas{' '}
      </canvas>
    </div>
  )
}
