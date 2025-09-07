import { colors, fontSize } from '@/constants/tokens';
import { buttonStyles, defaultStyles } from '@/styles';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';

type PlusMinusEditorProps = {
    value: number;
    changeSize: number;
    onChange: (value: number) => void;
    format: (value: number) => string;
    parse: (input: string) => number;
    suffix?: string;
    icon?: string
};

export default function PlusMinusEditor({ value, onChange, changeSize, format, parse, icon, suffix }: PlusMinusEditorProps) {
    const updateValue = (deltaMs: number) => {
        onChange(value + deltaMs);
    };

    const valueFormatted = format(value);

    return (
        <View style={[buttonStyles.buttonsRow, { alignItems: 'center' }]}>
            {icon &&
                <div style={{ flex: 2, textAlign: 'right', verticalAlign: 'center' }}>
                    <MaterialCommunityIcons name={icon as any} size={25} color={colors.text} />
                </div>
            }

            <div style={{width: 80,textAlign: 'right', verticalAlign: 'center' }}>
                <TextInput
                    value={valueFormatted}
                    onChangeText={(t) => {
                        const v = parse(t)
                        if (!isNaN(v)) onChange(v)
                    }}
                    keyboardType="decimal-pad"
                    style={styles.input}
                />
                {suffix &&
                    <Text style={defaultStyles.text}>{suffix}</Text>
                }
            </div>
            <View style={[buttonStyles.buttonsRow, { flex: 0, flexShrink: 1, flexBasis: 'auto', width: 'auto' }]}>
                <TouchableOpacity style={buttonStyles.button} onPress={() => updateValue(-1 * changeSize)}>
                    <FontAwesome6 name="minus" size={14} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={buttonStyles.button} onPress={() => updateValue(changeSize)}>
                    <FontAwesome6 name="plus" size={14} color={colors.text} />
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
    input: {
        color: colors.text,
        backgroundColor: colors.background,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        textAlign: 'right',
        fontSize: fontSize.base,
        width: 70,
    },
});
