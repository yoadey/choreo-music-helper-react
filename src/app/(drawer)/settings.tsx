import { colors } from '@/constants/tokens'
import { useVolumeFadeDuration, useSpeedFadeDuration } from '@/store/playbackState'
import Slider from '@react-native-community/slider'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

const SettingsScreen = () => {
    const [volumeFade, setVolumeFade] = useVolumeFadeDuration()
    const [speedFade, setSpeedFade] = useSpeedFadeDuration()

    const volumeValue = volumeFade ?? 2
    const speedValue = speedFade ?? 2

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.label}>Volume Fade In</Text>
                <View style={styles.sliderRow}>
                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={5}
                        step={0.1}
                        value={volumeValue}
                        onValueChange={(v) => setVolumeFade(Number(v.toFixed(1)))}
                        minimumTrackTintColor={colors.minimumTrackTintColor}
                        maximumTrackTintColor={colors.maximumTrackTintColor}
                        thumbTintColor={colors.primary}
                    />
                    <Text style={styles.value}>{volumeValue.toFixed(1)}s</Text>
                </View>
            </View>
            <View style={styles.section}>
                <Text style={styles.label}>Speed Fade In</Text>
                <View style={styles.sliderRow}>
                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={5}
                        step={0.1}
                        value={speedValue}
                        onValueChange={(v) => setSpeedFade(Number(v.toFixed(1)))}
                        minimumTrackTintColor={colors.minimumTrackTintColor}
                        maximumTrackTintColor={colors.maximumTrackTintColor}
                        thumbTintColor={colors.primary}
                    />
                    <Text style={styles.value}>{speedValue.toFixed(1)}s</Text>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        color: colors.text,
        marginBottom: 8,
    },
    sliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    slider: {
        flex: 1,
        height: 40,
    },
    value: {
        color: colors.text,
        marginLeft: 12,
        width: 50,
        textAlign: 'right',
    },
})

export default SettingsScreen
