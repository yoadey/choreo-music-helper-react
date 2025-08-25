import { buttonStyles, defaultStyles } from '@/styles';
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
            <Text style={[defaultStyles.text, { flex: 1, textAlign: 'right' }]}>
                {speed.toFixed(2)}x
            </Text>
            <View style={[buttonStyles.buttonsRow, { flex: 0, flexShrink: 1, flexBasis: 'auto', width: 'auto' }]}>
                <TouchableOpacity style={buttonStyles.button} onPress={() => updateSpeed(0.01)}>
                    <Text style={buttonStyles.buttonText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={buttonStyles.button} onPress={() => updateSpeed(-0.01)}>
                    <Text style={buttonStyles.buttonText}>-</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
