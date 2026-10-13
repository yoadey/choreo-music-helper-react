import { FontAwesome6 } from '@expo/vector-icons'
import React from 'react'
import { Pressable, View } from 'react-native'

export interface ColorPickerProps {
    colors: string[]
    value?: string
    onChange?: (color: string) => void
    circleSize?: number
    gap?: number
    accessibilityLabel?: string
}

/** Simple color picker built from React Native primitives, so it works on all platforms. */
export const ColorPicker: React.FC<ColorPickerProps> = ({
    colors = [],
    value,
    onChange,
    circleSize = 32,
    gap = 6,
    accessibilityLabel = 'Color',
}) => (
    <View
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}
    >
        {colors.map((color) => {
            const selected = value === color
            return (
                <Pressable
                    key={color}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={color}
                    onPress={() => onChange?.(color)}
                    style={{
                        width: circleSize,
                        height: circleSize,
                        borderRadius: circleSize / 2,
                        backgroundColor: color,
                        borderWidth: 2,
                        borderColor: 'rgb(167, 167, 167)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {selected && <FontAwesome6 name="check" size={circleSize * 0.55} color="#ffffff" />}
                </Pressable>
            )
        })}
    </View>
)

export default ColorPicker
