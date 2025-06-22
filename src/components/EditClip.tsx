import { colors } from '@/constants/tokens'
import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import { withObservables } from '@nozbe/watermelondb/react'
import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { TextInput } from 'react-native-gesture-handler'

const EditClip = ({ clip }: { clip: Clip }) => {

    const [title, setTitle] = useState(clip.title);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.box}>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={title}
                        onChangeText={setTitle}
                    />
                    <View style={styles.inputRow}>
                        <View style={styles.buttonsRow}>
                            <TouchableOpacity style={styles.button} onPress={() => {}}>
                                <Text style={styles.buttonText}>-1s</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.button} onPress={() => {}}>
                                <Text style={styles.buttonText}>+1s</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    )
}

const enhance = withObservables<{ clipId: string }, { clip: Clip }>(['clipId'], ({ clipId }) => ({
    // @ts-ignore
    clip: database.collections
        .get<Clip>("clips")
        .findAndObserve(clipId)
}));

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

export default enhance(EditClip)