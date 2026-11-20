import { useSyncExternalStore } from 'react'
import { getVersion, subscribe } from './data'
/** Re-render when copies are moved between boxes and decks. */
export const useVersion = () => useSyncExternalStore(subscribe, getVersion)
