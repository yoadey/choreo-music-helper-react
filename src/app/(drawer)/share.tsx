import { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import Clip from '@/model/clip'
import { shareTrackWithClips } from '@/helpers/share'

const ShareScreen = () => {
  const router = useRouter()
  const { currentTrack } = useCurrentTrack()
  const [clips, setClips] = useState<Clip[]>([])

  useEffect(() => {
    const sub = currentTrack?.clips
      .observeWithColumns(['position','speed'])
      .subscribe((c) => {
        const sorted = c.sort((a, b) => a.position - b.position)
        setClips(sorted)
      })
    return () => sub?.unsubscribe()
  }, [currentTrack?.id])

  useEffect(() => {
    if (!currentTrack) {
      router.back()
      return
    }
    shareTrackWithClips(currentTrack, clips).finally(() => router.back())
  }, [currentTrack, clips, router])

  return null
}

export default ShareScreen
