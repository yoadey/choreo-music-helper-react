import { colors } from '@/constants/tokens';
import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
    seconds: number;
    onSecondsChange: (newSeconds: number) => void;
    volume: number;
    onVolumeChange: (newVolume: number) => void;
    title?: string;
};

export const DurationVolumeComponent: React.FC<Props> = ({
    seconds,
    onSecondsChange,
    volume,
    onVolumeChange,
    title = 'Vorlauf',
}) => {
    const changeSeconds = (delta: number) => {
        const newValue = Math.max(0, seconds + delta);
        onSecondsChange(newValue);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.box}>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={seconds.toString()}
                        onChangeText={text => {
                            const parsed = parseInt(text);
                            if (!isNaN(parsed)) {
                                onSecondsChange(parsed);
                            }
                        }}
                    />
                    <View style={styles.inputRow}>
                        <View style={styles.buttonsRow}>
                            <TouchableOpacity style={styles.button} onPress={() => changeSeconds(-1)}>
                                <Text style={styles.buttonText}>-1s</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.button} onPress={() => changeSeconds(1)}>
                                <Text style={styles.buttonText}>+1s</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                <View style={styles.inputRow}>
                    <Slider
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
                    <Text style={styles.text}>{(volume * 100).toFixed(0)}%</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        margin: 20,
        position: 'relative',
        color: colors.text,
    },
    title: {
        position: 'absolute',
        top: -10,
        left: 20,
        backgroundColor: colors.background,
        color: colors.text,
        paddingHorizontal: 8,
        zIndex: 1,
    },
    text: {
        verticalAlign: 'middle',
        color: colors.text,
    },
    box: {
        borderWidth: 1,
        borderColor: colors.minimumTrackTintColor,
        padding: 20,
        borderRadius: 10,
        paddingTop: 30,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        verticalAlign: 'middle',
    },
    input: {
        flex: 1,
        borderWidth: 0,
        borderBottomWidth: 1,
        borderRadius: 0,
        textAlign: 'right',
        borderColor: colors.minimumTrackTintColor,
        color: colors.text,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 10,
    },
    slider: {
        width: 200,
        height: 40,
        margin: 10,
    },
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 12,
        gap: 8,
    },
    button: {
        flex: 1,
        backgroundColor: colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 10,
        marginHorizontal: 0,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
    },
    buttonText: {
        color: colors.text,
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default DurationVolumeComponent;