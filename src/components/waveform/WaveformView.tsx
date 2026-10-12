import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from 'react-native'
import { createScrubber, displayBarCount, resampleWaveform, secondsPerPixel } from './scrub'

type Props = {
  /** null while the waveform is loading */
  waveform: number[] | null
  progress: number
  duration: number
  onSeek: (progress: number) => void
  /** Seconds shown in the visible area */
  visibleTime?: number
  barWidth?: number
  barSpacing?: number
  elapsedBarColor?: string
  remainingBarColor?: string
  backgroundColor?: string
  maxHeight?: number
  baseline?: number
}

/**
 * Scrolling waveform with the current position in the center. Dragging moves the position:
 * the audio moves exactly as fast as the bars under the finger.
 */
export default function WaveformView({
  waveform,
  progress,
  onSeek,
  duration,
  visibleTime = 60,
  barWidth = 4,
  barSpacing = 2,
  elapsedBarColor = '#000',
  remainingBarColor = '#FFF',
  backgroundColor = 'transparent',
  maxHeight = 25,
  baseline = 1,
}: Props) {
  const [width, setWidth] = useState<number>(0)
  const barTotal = barWidth + barSpacing
  const visibleBarCount = Math.floor(width / barTotal)
  const bars = useMemo(
    () => (waveform ? resampleWaveform(waveform, displayBarCount(duration, visibleBarCount, visibleTime)) : null),
    [waveform, duration, visibleBarCount, visibleTime],
  )
  const length = bars?.length ?? 0

  const [scrubber] = useState(createScrubber)
  const secPerPixel = secondsPerPixel(duration, length, barTotal)

  const handleGrant = (evt: GestureResponderEvent) => scrubber.begin(evt.nativeEvent.pageX, progress)
  const handleMove = (evt: GestureResponderEvent) => {
    const target = scrubber.move(evt.nativeEvent.pageX, secPerPixel, duration)
    if (target !== null && secPerPixel > 0) onSeek(target)
  }

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width)
  }, [])

  const halfBarCount = Math.floor(visibleBarCount / 2)
  const exactIndex = duration > 0 ? (progress / duration) * length : 0
  const centerIndex = Math.floor(exactIndex)
  const start = centerIndex - halfBarCount
  const offset = (centerIndex - exactIndex) * barTotal

  // The bars only change when the waveform scrolls by a whole bar, not on every progress update
  const barViews = useMemo(
    () =>
      bars === null
        ? []
        : Array.from({ length: visibleBarCount }, (_, i) => {
            const idx = start + i
            const value = idx >= 0 && idx < bars.length ? bars[idx] : null
            const barHeight = value !== null ? Math.min(Math.max(value * 4 * maxHeight, baseline), maxHeight * 2) : 0
            const style = [
              styles.bar,
              {
                width: barWidth,
                height: barHeight,
                marginRight: i === visibleBarCount - 1 ? 0 : barSpacing,
                backgroundColor: i < halfBarCount ? elapsedBarColor : remainingBarColor,
              },
            ]
            return <View key={i} style={style} />
          }),
    [bars, start, visibleBarCount, halfBarCount, maxHeight, baseline, barWidth, barSpacing, elapsedBarColor, remainingBarColor],
  )

  return (
    <View
      onLayout={onLayout}
      style={[styles.container, { backgroundColor, height: maxHeight * 2 }]}
      testID="waveform"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={scrubber.end}
      onResponderTerminate={scrubber.end}
    >
      {bars === null ? (
        <ActivityIndicator />
      ) : (
        <View style={[styles.waveContainer, { left: offset }]}>
          {barViews.map((bar, i) => {
            if (i !== halfBarCount || !bar) return bar
            // Only the center bar changes on every progress update: it is split into elapsed / remaining
            const leftWidth = Math.round(Math.min(-offset, barWidth))
            return (
              <View key={bar.key} style={[bar.props.style, styles.centerWrapper]}>
                <View style={{ width: leftWidth, height: '100%', backgroundColor: elapsedBarColor }} />
                <View style={{ width: barWidth - leftWidth, height: '100%', backgroundColor: remainingBarColor }} />
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  waveContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerWrapper: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  bar: {
    alignSelf: 'center',
    borderRadius: 10,
  },
})
