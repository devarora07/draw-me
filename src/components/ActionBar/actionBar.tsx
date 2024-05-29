import { Tools, ToolsType } from '../../types'

import { LuPencil } from 'react-icons/lu'
import { FiMinus, FiMousePointer, FiSquare } from 'react-icons/fi'
import { IoHandRightOutline, IoText } from 'react-icons/io5'
import './action-bar-style.css'

export function ActionBar({
  tool,
  setTool,
}: {
  tool: ToolsType
  setTool: (tools: ToolsType) => void
}) {
  return (
    <div className="actionBar">
      {Object.values(Tools).map((item, index) => (
        <div
          className={`inputWrapper ${tool === item ? 'selected' : ''}`}
          key={item}
          onClick={() => setTool(item)}
        >
          <input
            type="radio"
            id={item}
            checked={tool === item}
            onChange={() => setTool(item)}
            readOnly
          />
          <label htmlFor={item}>{item}</label>
          {item === 'pan' && <IoHandRightOutline />}
          {item === 'selection' && <FiMousePointer />}
          {item === 'rectangle' && <FiSquare />}
          {item === 'line' && <FiMinus />}
          {item === 'pencil' && <LuPencil />}
          {item === 'text' && <IoText />}
          <span>{index + 1}</span>
        </div>
      ))}
    </div>
  )
}
