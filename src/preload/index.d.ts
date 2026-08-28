import type { SorterAPI } from '@shared/types'

declare global {
  interface Window {
    sorter: SorterAPI
  }
}
