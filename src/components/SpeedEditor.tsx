import { colors } from '@/constants/tokens'
import { stepSpeed } from '@/helpers/speed'
import { buttonStyles, defaultStyles } from '@/styles'
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

export type SpeedEditorProps = {
    speed: number
    onChange: (newSpeed: number) => void
}

export default function SpeedEditor({ speed, onChange }: SpeedEditorProps) {
    return (
        <View style={[buttonStyles.buttonsRow, { alignItems: 'center' }]}>
            <View style={{ flex: 2, alignItems: 'flex-end' }}>
                <MaterialCommunityIcons name="speedometer" size={25} color={colors.text} />
            </View>
            <Text style={[defaultStyles.text, { flex: 1, minWidth: 60, textAlign: 'right' }]} testID="clip-speed">
                {speed.toFixed(2)}x
            </Text>
            <View style={[buttonStyles.buttonsRow, { flex: 0, flexShrink: 1, flexBasis: 'auto', width: 'auto' }]}>
                <TouchableOpacity style={buttonStyles.button} onPress={() => onChange(stepSpeed(speed, 0.01))} accessibilityRole="button" accessibilityLabel="Faster">
                    <FontAwesome6 name="plus" size={14} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={buttonStyles.button} onPress={() => onChange(stepSpeed(speed, -0.01))} accessibilityRole="button" accessibilityLabel="Slower">
                    <FontAwesome6 name="minus" size={14} color={colors.text} />
                </TouchableOpacity>
            </View>
        </View>
    )
}
