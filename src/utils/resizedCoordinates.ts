export const resizedCoordinates = (
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
