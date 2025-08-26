import { colors } from '@/constants/tokens'
import TrackWithClips from '@/model/track'
import { database } from '@/model/index.web'
import { containerStyles, inputStyles, modalStyles } from '@/styles'
import { withObservables } from '@nozbe/watermelondb/react'
import { useHeaderHeight } from '@react-navigation/elements'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { CirclePicker } from 'react-color'
import { Button, Pressable, Text, TextInput, View } from 'react-native'

const colorSwatchesSelected = [
        "#FFFFFF",
        "#AFB42B",
        "#E64A19",
        "#C2185B",
        "#D32F2F",
        "#00796B",
        "#689F38",
        "#388E3C",
        "#0097A7",
        "#0288D1",
        "#1976D2",
        "#303F9F",
        "#512DA8",
        "#7B1FA2",
        "#455A64",
        "#5D4037",
]

const EditTrackModal = ({ track }: { track: TrackWithClips }) => {
        const router = useRouter()
        const headerHeight = useHeaderHeight()

        const [title, setTitle] = useState(track.title)
        const [color, setColor] = useState(track.color || '#00000000')

        useEffect(() => {
                setTitle(track.title)
                setColor(track.color || '#00000000')
        }, [track])

        const handleOk = async () => {
                database.write(async () =>
                        await track.update(trackUpdate => {
                                trackUpdate.title = title
                                trackUpdate.color = color
                        })
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
                                <Text style={modalStyles.title}>Track bearbeiten</Text>
                                <View style={containerStyles.inputRow}>
                                        <TextInput
                                                style={inputStyles.input}
                                                value={title}
                                                onChangeText={setTitle}
                                        />
                                </View>

                                <CirclePicker
                                        color={color}
                                        onChangeComplete={e => setColor(e.hex)}
                                        colors={colorSwatchesSelected}
                                        styles={{ default: { card: { marginTop: "15px", marginBottom: "5px" } } }}
                                />

                                <View style={{ marginTop: 24 }}>
                                        <Button title="OK" onPress={handleOk} color={colors.primary} />
                                </View>
                        </View>
                </View>
        )
}

// @ts-ignore
const enhance = withObservables<{}, { track: TrackWithClips }>([], ({ }) => {
        const { trackId } = useLocalSearchParams<{ trackId: string }>()
        return {
                track: database.collections
                        .get<TrackWithClips>("tracks")
                        .findAndObserve(trackId)
        }
})

export default enhance(EditTrackModal)
