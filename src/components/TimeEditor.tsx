import { colors } from '@/constants/tokens'
import { formatClipTime } from '@/helpers/miscellaneous'
import { buttonStyles, defaultStyles } from '@/styles'
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

type TimeEditorProps = {
    /** Position in seconds */
    seconds: number
    /** Maximum position in seconds (track length), undefined if unknown */
    max?: number
    onChange: (seconds: number) => void
}

const STEP = 0.1

export default function TimeEditor({ seconds, max, onChange }: TimeEditorProps) {
    const update = (delta: number) => {
        const next = Math.round((seconds + delta) * 10) / 10
        onChange(Math.min(Math.max(next, 0), max && max > 0 ? max : Number.POSITIVE_INFINITY))
    }

    return (
        <View style={[buttonStyles.buttonsRow, { alignItems: 'center' }]}>
            <View style={{ flex: 2, alignItems: 'flex-end' }}>
                <MaterialCommunityIcons name="clock-outline" size={25} color={colors.text} />
            </View>
            <Text style={[defaultStyles.text, { flex: 1, minWidth: 60, textAlign: 'right' }]} testID="clip-position">
                {formatClipTime(seconds)}
            </Text>
            <View style={[buttonStyles.buttonsRow, { flex: 0, flexShrink: 1, flexBasis: 'auto', width: 'auto' }]}>
                <TouchableOpacity style={buttonStyles.button} onPress={() => update(STEP)} accessibilityRole="button" accessibilityLabel="Later">
                    <FontAwesome6 name="plus" size={14} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={buttonStyles.button} onPress={() => update(-STEP)} accessibilityRole="button" accessibilityLabel="Earlier">
                    <FontAwesome6 name="minus" size={14} color={colors.text} />
                </TouchableOpacity>
            </View>
        </View>
    )
}
