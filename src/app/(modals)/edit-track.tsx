import { ColorPicker } from '@/components/ColorPicker'
import { colors, colorSwatches, TRANSPARENT } from '@/constants/tokens'
import { useObservedRecord } from '@/hooks/useObservedRecord'
import { t } from '@/i18n'
import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { containerStyles, inputStyles, modalStyles } from '@/styles'
import { useLocalSearchParams } from 'expo-router'
import { useCloseModal } from '@/hooks/useCloseModal'
import { useHeaderHeight } from 'expo-router/react-navigation'
import React, { useEffect, useState } from 'react'
import { Button, Pressable, Text, TextInput, View } from 'react-native'

const EditTrackForm = ({ track, onClose }: { track: TrackWithClips; onClose: () => void }) => {
    const [title, setTitle] = useState(track.title)
    const [color, setColor] = useState(track.color || TRANSPARENT)

    const handleOk = async () => {
        await database.write(async () => {
            await track.update((tr) => {
                tr.title = title
                tr.color = color
            })
        })
        onClose()
    }

    return (
        <View style={modalStyles.modal}>
            <Text style={modalStyles.title}>{t.editTrack}</Text>
            <View style={containerStyles.inputRow}>
                <TextInput style={inputStyles.input} value={title} onChangeText={setTitle} testID="track-title-input" />
            </View>

            <View style={{ width: 250, padding: 10, paddingVertical: 20 }}>
                <ColorPicker value={color} onChange={setColor} colors={colorSwatches} />
            </View>

            <View style={{ marginTop: 24, flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
                <Button title={t.cancel} onPress={onClose} color={colors.secondary} />
                <Button title={t.ok} onPress={handleOk} color={colors.primary} testID="track-ok" />
            </View>
        </View>
    )
}

const EditTrackModal = () => {
    const headerHeight = useHeaderHeight()
    const { trackId } = useLocalSearchParams<{ trackId: string }>()
    const track = useObservedRecord<TrackWithClips>('tracks', trackId)
    const close = useCloseModal()

    useEffect(() => {
        // Unknown track (e.g. deleted or stale link after reload)
        if (track === null) close()
    }, [track, close])

    return (
        <View style={[modalStyles.modalContainer, { paddingTop: headerHeight }]}>
            <Pressable style={modalStyles.backdrop} onPress={close} />
            {track && <EditTrackForm key={track.id} track={track} onClose={close} />}
        </View>
    )
}

export default EditTrackModal
