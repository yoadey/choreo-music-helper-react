import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  DimensionValue,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native'
import { extractWaveformWeb } from './useWaveformWeb'

type Props = {
  mp3Url: string | undefined
  progress: number
  duration: number
  onSeek: (progress: number) => void
  visibleTime?: number
  barWidth?: number
  barSpacing?: number
  progressedBarColor?: string
  remainingBarColor?: string
  backgroundColor?: string
  maxHeight?: number
  baseline?: number
}

export default function WaveformView({
  mp3Url,
  progress,
  onSeek,
  duration,
  visibleTime = 30,
  barWidth = 3,
  barSpacing = 2,
  progressedBarColor = '#000',
  remainingBarColor = '#FFF',
  backgroundColor = 'transparent',
  maxHeight = 25,
  baseline = 1,
}: Props) {
  const [waveform, setWaveform] = useState<number[] | null>(null)
  const [width, setWidth] = useState<number>(1)

  // We must use Refs, 
  const progressRef = useRef<number>(0)
  const scrubProgressRef = useRef<number | null>(null)
  const scrubXRef = useRef<number | null>(null)
  progressRef.current = progress

  const pixelPerSecond = visibleTime / width
  const barTotal = barWidth + barSpacing
  const barCount = width / barTotal
  const entries = Math.round(barCount / visibleTime * duration)
  useEffect(() => {
    if (waveform?.length !== entries) {
      setWaveform(Array(entries).fill(baseline))
    }
  }, [entries, baseline]);

  useEffect(() => {
    if (!mp3Url) return
    const work = async () => {
      extractWaveformWeb(mp3Url, barCount / visibleTime).then(({ waveform }) => {
        setWaveform(waveform)
      })
    }
    work()
  }, [mp3Url, barCount, visibleTime])


  const handleScrub = useCallback(
    (x: number) => {
      if (!onSeek || !pixelPerSecond) return
      if (!scrubXRef.current || !scrubProgressRef.current) {
        scrubProgressRef.current = progressRef.current
        scrubXRef.current = x
        return
      }

      const newProgress = scrubProgressRef.current + (scrubXRef.current - x) * pixelPerSecond
      onSeek(newProgress)
    }, [onSeek, pixelPerSecond]
  )

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: evt => {
          handleScrub(evt.nativeEvent.locationX)
        },
        onPanResponderMove: evt => {
          handleScrub(evt.nativeEvent.locationX)
        },
        onPanResponderRelease: () => {
          scrubXRef.current = null
          scrubProgressRef.current = null
        },
      }), [handleScrub]
  )


  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width)
  }, [])

  if (!waveform) {
    return <ActivityIndicator />
  }

  const visibleBarCount = Math.floor(width / barTotal)
  const halfBarCount = Math.floor(visibleBarCount / 2)

  // Zentrale Position im Array
  const centerIndex = Math.floor((progress / duration) * waveform.length)
  const start = centerIndex - halfBarCount

  // Sichtbares Slice, ggf. auffüllen mit null (für Padding)
  const visibleWaveform = Array.from({ length: visibleBarCount }, (_, i) => {
    const idx = start + i
    return idx >= 0 && idx < waveform.length ? waveform[idx] : null
  })

  const offset: DimensionValue = (centerIndex - progress / duration * waveform.length) * barTotal
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        {
          backgroundColor,
          height: maxHeight * 2,
        }
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[
        styles.waveContainer,
        {
          position: 'relative',
          left: offset,
        }
      ]}>
        {visibleWaveform.map((value, i) => {
          const isCenter = i === halfBarCount
          const barHeight = value ? Math.max(value * 4 * maxHeight, baseline) : 0
          const barStyle = {
            width: barWidth,
            height: barHeight,
            marginRight: i === visibleBarCount - 1 ? 0 : barSpacing,
            backgroundColor: isCenter ? undefined : i < halfBarCount ? progressedBarColor : remainingBarColor,
            ...styles.barStyle
          }

          if (isCenter) {
            const leftWidth = Math.round(Math.min(-1 * offset, barWidth))
            const rightWidth = barWidth - leftWidth
            return (
              <View key={i} style={[barStyle, styles.centerWrapper]}>
                <View style={[barStyle, { width: leftWidth, backgroundColor: progressedBarColor, marginRight: 0 }]} />
                <View style={[barStyle, { width: rightWidth, backgroundColor: remainingBarColor, marginRight: 0 }]} />
              </View>
            )
          }

          return <View key={i} style={barStyle} />
        })}
      </View>
    </View >
  )
}

interface BarProps {
  height: number;
  width: number;
  spacing: number;
  color: string;
}

const Bar: React.FC<BarProps> = React.memo(
  ({ height, width, spacing, color }) => (
    <View
      testID="waveform-bar"
      style={{
        width,
        height,
        marginRight: spacing,
        backgroundColor: color,
        alignSelf: 'center',
        borderRadius: 3,
      }}
    />

  ),
  (prev, next) =>
    prev.height === next.height &&
    prev.width === next.width &&
    prev.spacing === next.spacing &&
    prev.color === next.color
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  centerWrapper: {
    flexDirection: 'row',
    overflow: 'hidden',
    alignSelf: 'center'
  },
  barStyle: {
    alignSelf: 'center',
    borderRadius: 10,
  }
})
