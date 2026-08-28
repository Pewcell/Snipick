import type { Flag, PhotoEntry } from '@shared/types'

export interface SessionState {
  folderPath: string
  photos: PhotoEntry[]
  flags: Record<string, Flag>
  currentIndex: number
}

export type SessionAction =
  | { type: 'SET_PHOTOS'; folderPath: string; photos: PhotoEntry[]; initialFlags?: Record<string, Flag> }
  | { type: 'SET_FLAG'; path: string; flag: Flag }
  | { type: 'CLEAR_CATEGORY'; categoryId: string }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SET_INDEX'; index: number }
  | { type: 'RESET' }

export const initialSessionState: SessionState = {
  folderPath: '',
  photos: [],
  flags: {},
  currentIndex: 0
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_PHOTOS':
      return {
        ...state,
        folderPath: action.folderPath,
        photos: action.photos,
        flags: action.initialFlags ?? {},
        currentIndex: 0
      }
    case 'SET_FLAG':
      return {
        ...state,
        flags: { ...state.flags, [action.path]: action.flag }
      }
    case 'CLEAR_CATEGORY': {
      const flags = { ...state.flags }
      for (const path of Object.keys(flags)) {
        if (flags[path] === action.categoryId) flags[path] = null
      }
      return { ...state, flags }
    }
    case 'NEXT':
      return {
        ...state,
        currentIndex: Math.min(state.currentIndex + 1, Math.max(state.photos.length - 1, 0))
      }
    case 'PREV':
      return {
        ...state,
        currentIndex: Math.max(state.currentIndex - 1, 0)
      }
    case 'SET_INDEX':
      return {
        ...state,
        currentIndex: Math.min(Math.max(action.index, 0), Math.max(state.photos.length - 1, 0))
      }
    case 'RESET':
      return initialSessionState
    default:
      return state
  }
}

export function countFlags(
  flags: Record<string, Flag>,
  totalPhotos: number
): { byCategory: Record<string, number>; unflagged: number } {
  const byCategory: Record<string, number> = {}
  let flaggedCount = 0
  for (const value of Object.values(flags)) {
    if (value === null) continue
    byCategory[value] = (byCategory[value] ?? 0) + 1
    flaggedCount += 1
  }
  return { byCategory, unflagged: totalPhotos - flaggedCount }
}
