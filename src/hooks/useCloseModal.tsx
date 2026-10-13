import { useRouter } from 'expo-router'
import { useCallback } from 'react'

/** Closes a modal screen; after a reload (no history) it navigates to the start page instead. */
export const useCloseModal = () => {
    const router = useRouter()
    return useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router])
}
