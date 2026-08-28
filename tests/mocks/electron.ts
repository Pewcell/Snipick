import { tmpdir } from 'os'

export const app = {
  getPath: (_name: string): string => tmpdir()
}
