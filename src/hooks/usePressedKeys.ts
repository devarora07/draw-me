import { useEffect, useState } from 'react'

export const usePressedKeys = () => {
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
