import { colors } from '@/constants/tokens'
import { useVolumeFadeDuration, useSpeedFadeDuration } from '@/store/playbackState'
import { FontAwesome6 } from '@expo/vector-icons'
import React, { useCallback } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

const SettingsScreen = () => {
    const [volumeFade, setVolumeFade] = useVolumeFadeDuration()
    const [speedFade, setSpeedFade] = useSpeedFadeDuration()

    const volumeValue = volumeFade ?? 2
    const speedValue = speedFade ?? 2

    const clamp = (value: number) => Math.max(0, Math.min(5, Number(value.toFixed(1))))

    const changeVolume = useCallback((next: number) => {
        setVolumeFade(clamp(next))
    }, [setVolumeFade])

    const changeSpeed = useCallback((next: number) => {
        setSpeedFade(clamp(next))
    }, [setSpeedFade])

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.label}>Volume Fade In</Text>
                <Text style={styles.description}>How long the volume takes to reach full level when starting playback.</Text>
                <View style={styles.row}>
                    <TouchableOpacity onPress={() => changeVolume(volumeValue - 0.1)} style={styles.iconButton}>
                        <FontAwesome6 name="minus" size={16} color={colors.text} />
                    </TouchableOpacity>
                    <TextInput
                        value={volumeValue.toFixed(1)}
                        onChangeText={(t) => {
                            const v = parseFloat(t)
                            if (!isNaN(v)) changeVolume(v)
                        }}
                        keyboardType="decimal-pad"
                        style={styles.input}
                    />
                    <TouchableOpacity onPress={() => changeVolume(volumeValue + 0.1)} style={styles.iconButton}>
                        <FontAwesome6 name="plus" size={16} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.suffix}>s</Text>
                </View>
            </View>
            <View style={styles.section}>
                <Text style={styles.label}>Speed Fade In</Text>
                <Text style={styles.description}>How long the playback speed takes to ramp up to the selected speed.</Text>
                <View style={styles.row}>
                    <TouchableOpacity onPress={() => changeSpeed(speedValue - 0.1)} style={styles.iconButton}>
                        <FontAwesome6 name="minus" size={16} color={colors.text} />
                    </TouchableOpacity>
                    <TextInput
                        value={speedValue.toFixed(1)}
                        onChangeText={(t) => {
                            const v = parseFloat(t)
                            if (!isNaN(v)) changeSpeed(v)
                        }}
                        keyboardType="decimal-pad"
                        style={styles.input}
                    />
                    <TouchableOpacity onPress={() => changeSpeed(speedValue + 0.1)} style={styles.iconButton}>
                        <FontAwesome6 name="plus" size={16} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.suffix}>s</Text>
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
        marginBottom: 32,
        backgroundColor: colors.backgroundHighlighted,
        padding: 16,
        borderRadius: 8,
    },
    label: {
        color: colors.text,
        marginBottom: 4,
        fontWeight: 'bold',
    },
    description: {
        color: colors.textMuted,
        marginBottom: 12,
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 8,
    },
    input: {
        color: colors.text,
        backgroundColor: colors.background,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        textAlign: 'center',
        width: 60,
    },
    suffix: {
        color: colors.text,
        marginLeft: 8,
    },
})

export default SettingsScreen
