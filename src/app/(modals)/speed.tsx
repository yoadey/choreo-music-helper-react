import { colors } from '@/constants/tokens'
import { useGlobalSpeedOnly, useSpeed } from '@/store/playbackState'
import { modalStyles } from '@/styles'
import Slider from '@react-native-community/slider'
import { useHeaderHeight } from '@react-navigation/elements'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Button, Pressable, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'

const MIN_SPEED = 0.5
const MAX_SPEED = 2.0
const STEP = 0.01

const SpeedModal = () => {
	const router = useRouter()
	const headerHeight = useHeaderHeight()

        const [speed, setSpeed] = useSpeed()
        const [globalOnly, setGlobalOnly] = useGlobalSpeedOnly()
        const [speedLocal, setSpeedLocal] = useState(speed ?? 1.0)
        const [globalOnlyLocal, setGlobalOnlyLocal] = useState(globalOnly ?? false)

        // Always use current speed when modal opens
        useEffect(() => {
                setSpeedLocal(speed ?? 1.0)
                setGlobalOnlyLocal(globalOnly ?? false)
        }, [speed, globalOnly])

	const setAndApplySpeedLocal = (newSpeed: number) => {
		const clamped = Math.max(MIN_SPEED, Math.min(MAX_SPEED, newSpeed))
		setSpeedLocal(clamped)
	}

	const handleSpeedButton = (delta: number) => {
		setAndApplySpeedLocal(Number((speedLocal + delta).toFixed(2)))
	}

	const handleSliderChange = (value: number) => {
		setAndApplySpeedLocal(Number(value.toFixed(2)))
	}

	const handleOk = async () => {
                setSpeed(speedLocal)
                setGlobalOnly(globalOnlyLocal)
                router.dismiss()
        }

	const handleCancel = () => {
		router.dismiss()
	}

	return (
		<View style={[modalStyles.modalContainer, { paddingTop: headerHeight }]}>
			<Pressable style={modalStyles.backdrop} onPress={handleCancel} />

			<View style={modalStyles.modal}>
				<Text style={modalStyles.title}>Geschwindigkeit</Text>
				<Text style={styles.currentSpeedText}>{speedLocal.toFixed(2)}x</Text>
				<View style={styles.speedLabelsRow}>
					<Text style={styles.speedLabel}>0.50</Text>
					<Text style={styles.speedLabel}>1.00</Text>
					<Text style={styles.speedLabel}>2.00</Text>
				</View>
				{/* value && onValueChange: Adjust for better UX, since slider values are 0-1, we map them to 0.5-2.0 */}
				<Slider
					style={styles.slider}
					minimumValue={0}
					maximumValue={MAX_SPEED}
					step={STEP}
					value={speedLocal > 1 ? speedLocal : (speedLocal - MIN_SPEED) * 2}
					onValueChange={(speed) => handleSliderChange(speedLocal > 1 ? speed : (speed) / 2 + MIN_SPEED)}
					minimumTrackTintColor={colors.minimumTrackTintColor}
					maximumTrackTintColor={colors.maximumTrackTintColor}
					thumbTintColor={colors.primary}
				/>
				<View style={styles.buttonsRow}>
					<TouchableOpacity style={styles.button} onPress={() => handleSpeedButton(-0.10)}>
						<Text style={styles.buttonText}>-10</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.button} onPress={() => handleSpeedButton(-0.01)}>
						<Text style={styles.buttonText}>-1</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.button} onPress={() => setAndApplySpeedLocal(1.0)}>
						<Text style={styles.buttonText}>1.00</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.button} onPress={() => handleSpeedButton(0.01)}>
						<Text style={styles.buttonText}>+1</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.button} onPress={() => handleSpeedButton(0.10)}>
						<Text style={styles.buttonText}>+10</Text>
					</TouchableOpacity>
				</View>
                                <View style={styles.globalRow}>
                                        <Switch value={globalOnlyLocal} onValueChange={setGlobalOnlyLocal} />
                                        <Text style={styles.globalLabel}>Nur globale Geschwindigkeit</Text>
                                </View>
                                <View style={{ marginTop: 24 }}>
                                        <Button title="OK" onPress={handleOk} color={colors.primary} />
                                </View>
			</View>
		</View>
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
