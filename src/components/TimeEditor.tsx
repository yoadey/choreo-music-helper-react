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
    const milliseconds = Math.floor((timeMs % 1000) / 100) * 100;

    return (
        <View style={styles.container}>
            <TimePart
                label="Min"
                value={minutes}
                onIncrease={() => updateTime(60000)}
                onDecrease={() => updateTime(-60000)}
            />
            <TimePart
                label="Sec"
                value={seconds}
                onIncrease={() => updateTime(1000)}
                onDecrease={() => updateTime(-1000)}
            />
            <TimePart
                label="Ms"
                value={milliseconds}
                onIncrease={() => updateTime(100)}
                onDecrease={() => updateTime(-100)}
            />
        </View>
    );
}

type TimePartProps = {
    label: string;
    value: number;
    onIncrease: () => void;
    onDecrease: () => void;
};

function TimePart({ label, value, onIncrease, onDecrease }: TimePartProps) {
    return (
        <View style={styles.part}>
            <Text style={defaultStyles.label}>{label}</Text>
            <Text style={defaultStyles.text}>{value.toString().padStart(2, '0')}</Text>
            <View style={buttonStyles.buttonsRow}>
                <TouchableOpacity style={buttonStyles.button} onPress={onIncrease}>
                    <Text style={buttonStyles.buttonText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={buttonStyles.button} onPress={onDecrease}>
                    <Text style={buttonStyles.buttonText}>-</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
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
