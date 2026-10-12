import { sortByPosition } from '@/helpers/playback'
import { shareTrackWithClips } from '@/helpers/share'
import { useCurrentTrackStore } from '@/store/store'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'

/** Shares the current track with its clips as chapters once and returns. */
const ShareScreen = () => {
  const router = useRouter()

  useEffect(() => {
    const currentTrack = useCurrentTrackStore.getState().currentTrack
    const close = () => (router.canGoBack() ? router.back() : router.replace('/'))
    if (!currentTrack) {
      close()
      return
    }
    let cancelled = false
    currentTrack.clips
      .fetch()
      .then((clips) => (cancelled ? undefined : shareTrackWithClips(currentTrack, sortByPosition(clips))))
      .catch((error) => console.warn('Sharing failed', error))
      .finally(() => {
        if (!cancelled) close()
      })
    return () => {
      cancelled = true
    }
  }, [router])

  return null
}

export default ShareScreen
