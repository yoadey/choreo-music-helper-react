import { colors } from '@/constants/tokens'
import { clampSpeed, MAX_SPEED, sliderToSpeed, speedToSlider, stepSpeed } from '@/helpers/speed'
import { t } from '@/i18n'
import { useGlobalSpeedOnly, useSpeed } from '@/store/playbackState'
import { modalStyles } from '@/styles'
import Slider from '@react-native-community/slider'
import { ModalScreen } from '@/components/ModalScreen'
import { useCloseModal } from '@/hooks/useCloseModal'
import React, { useState } from 'react'
import { Button, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'

const SpeedModal = () => {
	const [speed, setSpeed] = useSpeed()
	const [globalOnly, setGlobalOnly] = useGlobalSpeedOnly()
	const [speedLocal, setSpeedLocal] = useState(speed ?? 1.0)
	const [globalOnlyLocal, setGlobalOnlyLocal] = useState(globalOnly ?? false)

	const close = useCloseModal()

	const handleOk = () => {
		setSpeed(clampSpeed(speedLocal))
		setGlobalOnly(globalOnlyLocal)
		close()
	}

	return (
		<ModalScreen onClose={close}>
			<View style={modalStyles.modal}>
				<Text style={modalStyles.title}>{t.speed}</Text>
				<Text style={styles.currentSpeedText} testID="speed-value">
					{speedLocal.toFixed(2)}x
				</Text>
				<View style={styles.speedLabelsRow}>
					<Text style={styles.speedLabel}>0.50</Text>
					<Text style={styles.speedLabel}>1.00</Text>
					<Text style={styles.speedLabel}>2.00</Text>
				</View>
				{/* The left half of the slider covers 0.5–1.0, the right half 1.0–2.0 */}
				<Slider
					style={styles.slider}
					minimumValue={0}
					maximumValue={MAX_SPEED}
					step={0.01}
					value={speedToSlider(speedLocal)}
					onValueChange={(value) => setSpeedLocal(sliderToSpeed(value))}
					minimumTrackTintColor={colors.minimumTrackTintColor}
					maximumTrackTintColor={colors.maximumTrackTintColor}
					thumbTintColor={colors.primary}
				/>
				<View style={styles.buttonsRow}>
					{[
						['-10', -0.1],
						['-1', -0.01],
						['1.00', 0],
						['+1', 0.01],
						['+10', 0.1],
					].map(([label, delta]) => (
						<TouchableOpacity
							key={label}
							style={styles.button}
							onPress={() => setSpeedLocal(delta === 0 ? 1 : stepSpeed(speedLocal, delta as number))}
							accessibilityLabel={`Speed ${label}`}
						>
							<Text style={styles.buttonText}>{label}</Text>
						</TouchableOpacity>
					))}
				</View>
				<View style={styles.globalRow}>
					<Switch
						value={globalOnlyLocal}
						onValueChange={setGlobalOnlyLocal}
						thumbColor={globalOnlyLocal ? colors.primary : colors.disabled}
						trackColor={{ true: colors.disabled, false: 'rgb(147, 147, 147)' }}
					/>
					<Text style={styles.globalLabel}>{t.overrideClipSpeed}</Text>
				</View>
				<View style={{ marginTop: 24 }}>
					<Button title={t.ok} onPress={handleOk} color={colors.primary} testID="speed-ok" />
				</View>
			</View>
		</ModalScreen>
	)
}

const styles = StyleSheet.create({
	speedLabelsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		paddingHorizontal: 8,
		marginBottom: 4,
	},
	speedLabel: {
		fontSize: 14,
		color: colors.text,
		width: 40,
		textAlign: 'center',
	},
	slider: {
		width: '100%',
		height: 40,
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
		padding: 10,
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
	currentSpeedText: {
		marginBottom: 16,
		fontSize: 18,
		fontWeight: '600',
		textAlign: 'center',
		color: colors.primary,
	},
	globalRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 16,
	},
	globalLabel: {
		marginLeft: 8,
		color: colors.text,
	},
})

export default SpeedModal
