import ColorPicker from '@/components/ColorPicker'
import SpeedEditor from '@/components/SpeedEditor'
import TimeEditor from '@/components/TimeEditor'
import { colors, colorSwatches } from '@/constants/tokens'
import { useObservedRecord } from '@/hooks/useObservedRecord'
import { t } from '@/i18n'
import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { containerStyles, inputStyles, modalStyles } from '@/styles'
import { useLocalSearchParams } from 'expo-router'
import { ModalScreen } from '@/components/ModalScreen'
import { useCloseModal } from '@/hooks/useCloseModal'
import React, { useEffect, useState } from 'react'
import { Button, Text, TextInput, View } from 'react-native'

const EditClipForm = ({ clip, onClose }: { clip: Clip; onClose: () => void }) => {
    const [title, setTitle] = useState(clip.title)
    const [position, setPosition] = useState(clip.position)
    const [color, setColor] = useState(clip.color)
    const [speed, setSpeed] = useState(clip.speed ?? 1)
    const [trackLength, setTrackLength] = useState<number>()

    useEffect(() => {
        clip.track
            .fetch()
            .then((track: TrackWithClips | null) => setTrackLength(track?.length ? track.length / 1000 : undefined))
            .catch(() => undefined)
    }, [clip])

    const handleOk = async () => {
        await database.write(async () => {
            await clip.update((c) => {
                c.title = title
                c.position = position
                c.color = color
                c.speed = speed
            })
        })
        onClose()
    }

    return (
        <View style={modalStyles.modal}>
            <Text style={modalStyles.title}>{t.editClip}</Text>
            <View style={containerStyles.inputRow}>
                <TextInput style={inputStyles.input} value={title} onChangeText={setTitle} testID="clip-title-input" />
            </View>

            <View style={{ width: 250, padding: 10, paddingVertical: 20 }}>
                <ColorPicker value={color} onChange={setColor} colors={colorSwatches} />
            </View>

            <TimeEditor seconds={position} max={trackLength} onChange={setPosition} />
            <View style={{ height: 10 }} />
            <SpeedEditor speed={speed} onChange={setSpeed} />

            <View style={{ marginTop: 24, flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
                <Button title={t.cancel} onPress={onClose} color={colors.secondary} />
                <Button title={t.ok} onPress={handleOk} color={colors.primary} testID="clip-ok" />
            </View>
        </View>
    )
}

const EditClipModal = () => {
    const { clipId } = useLocalSearchParams<{ clipId: string }>()
    const clip = useObservedRecord<Clip>('clips', clipId)
    const close = useCloseModal()

    useEffect(() => {
        // Unknown clip (e.g. deleted or stale link after reload)
        if (clip === null) close()
    }, [clip, close])

    return (
        <ModalScreen onClose={close}>
            {clip && <EditClipForm key={clip.id} clip={clip} onClose={close} />}
        </ModalScreen>
    )
}

export default EditClipModal
