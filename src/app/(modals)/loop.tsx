import { DurationVolumeComponent } from '@/components/DurationVolume'
import { colors } from '@/constants/tokens'
import { t } from '@/i18n'
import { useLeadInDuration, useLeadInVolume, useLeadOutDuration, useLeadOutVolume } from '@/store/playbackState'
import { modalStyles } from '@/styles'
import { ModalScreen } from '@/components/ModalScreen'
import { useCloseModal } from '@/hooks/useCloseModal'
import React, { useState } from 'react'
import { Button, Text, View } from 'react-native'

const LoopModal = () => {
	const [leadInDuration, setLeadInDuration] = useLeadInDuration()
	const [leadInVolume, setLeadInVolume] = useLeadInVolume()
	const [leadOutDuration, setLeadOutDuration] = useLeadOutDuration()
	const [leadOutVolume, setLeadOutVolume] = useLeadOutVolume()
	const [leadInDurationLocal, setLeadInDurationLocal] = useState(leadInDuration ?? 0)
	const [leadInVolumeLocal, setLeadInVolumeLocal] = useState(leadInVolume ?? 1)
	const [leadOutDurationLocal, setLeadOutDurationLocal] = useState(leadOutDuration ?? 0)
	const [leadOutVolumeLocal, setLeadOutVolumeLocal] = useState(leadOutVolume ?? 1)

	const close = useCloseModal()

	const handleOk = () => {
		setLeadInDuration(leadInDurationLocal)
		setLeadInVolume(leadInVolumeLocal)
		setLeadOutDuration(leadOutDurationLocal)
		setLeadOutVolume(leadOutVolumeLocal)
		close()
	}

	return (
		<ModalScreen onClose={close}>
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
		</ModalScreen>
	)
}

export default LoopModal
