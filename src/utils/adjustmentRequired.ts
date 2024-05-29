import { ToolsType } from '../types'

export const adjustmentRequired = (type: ToolsType) => {
  return ['line', 'rectangle'].includes(type)
}
