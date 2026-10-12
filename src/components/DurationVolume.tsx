import { colors } from '@/constants/tokens'
import { parseDurationInput, stepSeconds } from '@/helpers/miscellaneous'
import { defaultStyles, inputStyles, modalStyles } from '@/styles'
import Slider from '@react-native-community/slider'
import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

type Props = {
    seconds: number
    onSecondsChange: (newSeconds: number) => void
    volume: number
    onVolumeChange: (newVolume: number) => void
    title: string
    testID?: string
    /** False if the browser ignores volume changes (iOS Safari) */
    volumeSupported?: boolean
}

export const DurationVolumeComponent: React.FC<Props> = ({
    seconds,
    onSecondsChange,
    volume,
    onVolumeChange,
    title,
    testID,
    volumeSupported = true,
}) => {
    // The text is kept separately, so the field can be cleared while typing
    const [text, setText] = useState(String(seconds))
    const [previousSeconds, setPreviousSeconds] = useState(seconds)
    if (seconds !== previousSeconds) {
        // Changed from outside (e.g. the +1s button)
        setPreviousSeconds(seconds)
        if (parseDurationInput(text) !== seconds) setText(String(seconds))
    }

    const changeSeconds = (delta: number) => {
        onSecondsChange(stepSeconds(seconds, delta))
    }

    return (
        <View style={[modalStyles.container, { marginLeft: 0, marginRight: 0 }]}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.box}>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        value={text}
                        testID={testID ? `${testID}-seconds` : undefined}
                        onChangeText={(value) => {
                            setText(value)
                            const parsed = parseDurationInput(value)
                            if (parsed !== null) onSecondsChange(parsed)
                        }}
                        onBlur={() => setText(String(seconds))}
                    />
                    <View style={styles.buttonsRow}>
                        <TouchableOpacity style={styles.button} onPress={() => changeSeconds(-1)}>
                            <Text style={styles.buttonText}>-1s</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.button} onPress={() => changeSeconds(1)}>
                            <Text style={styles.buttonText}>+1s</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.inputRow}>
                    <Slider
                        disabled={!volumeSupported}
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={1}
                        step={0.01}
                        value={volume}
                        onValueChange={onVolumeChange}
                        minimumTrackTintColor={colors.minimumTrackTintColor}
                        maximumTrackTintColor={colors.maximumTrackTintColor}
                        thumbTintColor={colors.primary}
                    />
                    <Text style={defaultStyles.text}>{(volume * 100).toFixed(0)}%</Text>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    title: {
        position: 'absolute',
        top: -10,
        left: 20,
        backgroundColor: colors.modal,
        color: colors.text,
        paddingHorizontal: 8,
        zIndex: 1,
    },
    box: {
        borderWidth: 1,
        borderColor: colors.minimumTrackTintColor,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 10,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        ...inputStyles.input,
        textAlign: 'right',
    },
    slider: {
        width: 200,
        height: 40,
        margin: 10,
    },
    buttonsRow: {
        flexDirection: 'row',
        flex: 1,
        marginLeft: 8,
        gap: 8,
    },
    button: {
        flex: 1,
        backgroundColor: colors.primary,
        padding: 10,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: colors.text,
        fontWeight: 'bold',
        fontSize: 16,
    },
})

export default DurationVolumeComponent
