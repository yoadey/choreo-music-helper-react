import ColorPicker from '@/components/ColorPicker'
import PlusMinusEditor from '@/components/PlusMinusEditor'
import { colors } from '@/constants/tokens'
import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import { containerStyles, inputStyles, modalStyles } from '@/styles'
import { withObservables } from '@nozbe/watermelondb/react'
import { useHeaderHeight } from '@react-navigation/elements'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Button, Pressable, Text, TextInput, View } from 'react-native'

const colorSwatchesSelected = [
    '#00000000',
    '#AFB42B',
    '#E64A19',
    '#C2185B',
    '#D32F2F',
    '#00796B',
    '#689F38',
    '#388E3C',
    '#0097A7',
    '#0288D1',
    '#1976D2',
    '#303F9F',
    '#512DA8',
    '#7B1FA2',
    '#455A64',
    '#5D4037',
]

const EditClipModal = ({ clip }: { clip: Clip }) => {
    const router = useRouter()
    const headerHeight = useHeaderHeight()

    const [title, setTitle] = useState(clip.title)
    const [position, setPosition] = useState(clip.position)
    const [color, setColor] = useState(clip.color)
    const [speed, setSpeed] = useState(clip.speed ?? 1)

    useEffect(() => {
        setTitle(clip.title)
        setPosition(clip.position)
        setColor(clip.color)
        setSpeed(clip.speed ?? 1)
    }, [clip])

    const handleOk = async () => {
        database.write(
            async () =>
                await clip.update((clipUpdate) => {
                    clipUpdate.title = title
                    clipUpdate.position = position
                    clipUpdate.color = color
                    clipUpdate.speed = speed
                }),
        )
        router.dismiss()
    }

    const handleCancel = () => {
        router.dismiss()
    }

    return (
        <View style={[modalStyles.modalContainer, { paddingTop: headerHeight }]}>
            <Pressable style={modalStyles.backdrop} onPress={handleCancel} />

            <View style={modalStyles.modal}>
                <Text style={modalStyles.title}>Clip bearbeiten</Text>
                <View style={containerStyles.inputRow}>
                    <TextInput style={inputStyles.input} value={title} onChangeText={setTitle} />
                </View>

                <View style={{ width: 250, padding: 10, paddingTop: 20, paddingBottom: 20 }}>
                    <ColorPicker
                        value={color}
                        onChange={(e) => setColor(e)}
                        colors={colorSwatchesSelected}
                    />
                </View>

                <PlusMinusEditor
                    value={position}
                    onChange={setPosition}
                    format={(value) => {
                        const minutes = Math.floor(value / 60);
                        const seconds = Math.floor((value % 60));
                        const milliseconds = Math.floor((value * 1000 % 1000) / 100);
                        return minutes.toString() + ":" + seconds.toString().padStart(2, '0') + "." + milliseconds.toString()
                    }}
                    parse={(input) => {
                        if (!/^\d+:\d+(\.\d+)?$/.test(input)) return NaN;
                        const [m, s] = input.split(":");
                        return parseInt(m, 10) * 60 + parseFloat(s);
                    }}
                    changeSize={0.1}
                    icon="clock-outline"
                />
                <div style={{ height: 10 }} />

                <PlusMinusEditor
                    value={speed}
                    onChange={setSpeed}
                    format={(value) => value.toFixed(2)}
                    parse={(input) => parseFloat(input)}
                    changeSize={0.01}
                    icon="speedometer"
                    suffix="x"
                />

                <View style={{ marginTop: 24 }}>
                    <Button title="OK" onPress={handleOk} color={colors.primary} />
                </View>
            </View>
        </View>
    )
}

// @ts-expect-error - WatermelonDB typing does not expose observe
const enhance = withObservables<Record<string, never>, { clip: Clip }>([], () => {
    const { clipId } = useLocalSearchParams<{ clipId: string }>()
    return {
        clip: database.collections.get<Clip>('clips').findAndObserve(clipId),
    }
})

export default enhance(EditClipModal)
