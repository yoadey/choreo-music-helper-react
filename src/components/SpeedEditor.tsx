import { colors } from '@/constants/tokens';
import { buttonStyles, defaultStyles } from '@/styles';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export type SpeedEditorProps = {
    speed: number;
    onChange: (newSpeed: number) => void;
};

export default function SpeedEditor({ speed, onChange }: SpeedEditorProps) {
    const updateSpeed = (delta: number) => {
        const newSpeed = Math.max(0.5, Math.min(2.0, Number((speed + delta).toFixed(2))));
        onChange(newSpeed);
    };

    return (
        <View style={[buttonStyles.buttonsRow, { alignItems: 'center' }]}>
            <div style={{ flex: 2, textAlign: 'right', verticalAlign: 'center' }}>
                <MaterialCommunityIcons name="speedometer" size={25} color={colors.text} />
            </div>
            <Text style={[defaultStyles.text, { flex: 1, minWidth: 60, textAlign: 'right' }]}>
                {speed.toFixed(2)}x
            </Text>
            <View style={[buttonStyles.buttonsRow, { flex: 0, flexShrink: 1, flexBasis: 'auto', width: 'auto' }]}>
                <TouchableOpacity style={buttonStyles.button} onPress={() => updateSpeed(0.01)}>
                    <FontAwesome6 name="plus" size={14} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={buttonStyles.button} onPress={() => updateSpeed(-0.01)}>
                    <FontAwesome6 name="minus" size={14} color={colors.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
}
