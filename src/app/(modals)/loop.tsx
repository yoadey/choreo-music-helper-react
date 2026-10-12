import { DurationVolumeComponent } from '@/components/DurationVolume'
import { colors } from '@/constants/tokens'
import { t } from '@/i18n'
import { useLeadInDuration, useLeadInVolume, useLeadOutDuration, useLeadOutVolume } from '@/store/playbackState'
import { modalStyles } from '@/styles'
import { useRouter } from 'expo-router'
import { useHeaderHeight } from 'expo-router/react-navigation'
import React, { useState } from 'react'
import { Button, Pressable, Text, View } from 'react-native'

const LoopModal = () => {
	const router = useRouter()
	const headerHeight = useHeaderHeight()

	const [leadInDuration, setLeadInDuration] = useLeadInDuration()
	const [leadInVolume, setLeadInVolume] = useLeadInVolume()
	const [leadOutDuration, setLeadOutDuration] = useLeadOutDuration()
	const [leadOutVolume, setLeadOutVolume] = useLeadOutVolume()
	const [leadInDurationLocal, setLeadInDurationLocal] = useState(leadInDuration ?? 0)
	const [leadInVolumeLocal, setLeadInVolumeLocal] = useState(leadInVolume ?? 1)
	const [leadOutDurationLocal, setLeadOutDurationLocal] = useState(leadOutDuration ?? 0)
	const [leadOutVolumeLocal, setLeadOutVolumeLocal] = useState(leadOutVolume ?? 1)

	const close = () => (router.canGoBack() ? router.back() : router.replace('/'))

	const handleOk = () => {
		setLeadInDuration(leadInDurationLocal)
		setLeadInVolume(leadInVolumeLocal)
		setLeadOutDuration(leadOutDurationLocal)
		setLeadOutVolume(leadOutVolumeLocal)
		close()
	}

	return (
		<View style={[modalStyles.modalContainer, { paddingTop: headerHeight }]}>
			<Pressable style={modalStyles.backdrop} onPress={close} />

			<View style={modalStyles.modal}>
				<Text style={modalStyles.title}>{t.preparationTime}</Text>
				<DurationVolumeComponent
					seconds={leadInDurationLocal}
					onSecondsChange={setLeadInDurationLocal}
					volume={leadInVolumeLocal}
					onVolumeChange={setLeadInVolumeLocal}
					title={t.leadIn}
					testID="lead-in"
				/>
				<DurationVolumeComponent
					seconds={leadOutDurationLocal}
					onSecondsChange={setLeadOutDurationLocal}
					volume={leadOutVolumeLocal}
					onVolumeChange={setLeadOutVolumeLocal}
					title={t.leadOut}
					testID="lead-out"
				/>
				<View style={{ marginTop: 24 }}>
					<Button title={t.ok} onPress={handleOk} color={colors.primary} testID="loop-ok" />
				</View>
			</View>
		</View>
	)
}

export default LoopModal
