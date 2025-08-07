import { buttonStyles, defaultStyles } from '@/styles';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TimeEditorProps = {
    timeMs: number;
    onChange: (newTimeMs: number) => void;
};

export default function TimeEditor({ timeMs, onChange }: TimeEditorProps) {
    const updateTime = (deltaMs: number) => {
        const newTime = Math.max(0, timeMs + deltaMs);
        onChange(newTime);
    };

    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const milliseconds = Math.floor((timeMs % 1000) / 100);

    return (
        <View style={[buttonStyles.buttonsRow, {alignItems: 'center'}]}>
            <Text style={[defaultStyles.text, { flex: 1, textAlign: 'right' }]}>{minutes.toString()}:{seconds.toString().padStart(2, '0')}.{milliseconds.toString()}</Text>
            <View style={[buttonStyles.buttonsRow, { flex: 0, flexShrink: 1, flexBasis: 'auto', width: 'auto' }]}>
                <TouchableOpacity style={buttonStyles.button} onPress={() => updateTime(100)}>
                    <Text style={buttonStyles.buttonText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={buttonStyles.button} onPress={() => updateTime(-100)}>
                    <Text style={buttonStyles.buttonText}>-</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        verticalAlign: 'middle',
        padding: 10,
    },
    part: {
        marginHorizontal: 10,
        alignItems: 'center',
    },
    value: {
        fontSize: 24,
        marginVertical: 5,
    },
    buttons: {
        flexDirection: 'row',
    },
});
