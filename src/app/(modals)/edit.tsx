import EditClip from '@/components/EditClip'
import { colors, screenPadding } from '@/constants/tokens'
import { defaultStyles } from '@/styles'
import { useHeaderHeight } from '@react-navigation/elements'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React from 'react'
import { Button, Pressable, StyleSheet, Text, View } from 'react-native'

const MIN_SPEED = 0.5
const MAX_SPEED = 2.0
const STEP = 0.01

const EditClipModal = () => {
	const router = useRouter()
	const headerHeight = useHeaderHeight()
	const { clipId } = useLocalSearchParams<{ clipId?: string }>();


	const handleOk = async () => {
		router.dismiss()
	}

	const handleCancel = () => {
		router.dismiss()
	}

	return (
		<View style={[styles.modalContainer, { paddingTop: headerHeight }]}>
			<Pressable style={styles.backdrop} onPress={handleCancel} />

			<View style={styles.modal}>
				<Text style={styles.title}>Clip bearbeiten</Text>
				<EditClip clipId={clipId} />
				<View style={{ marginTop: 24 }}>
					<Button title="OK" onPress={handleOk} color={colors.primary} />
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	modalContainer: {
		...defaultStyles.container,
		flex: 1,
		paddingHorizontal: screenPadding.horizontal,
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative',
		backgroundColor: 'rgba(0, 0, 0, 0)',
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(255, 255, 255, 0.3)',
	},
	modal: {
		backgroundColor: colors.background,
		padding: 20,
		borderRadius: 12,
		minWidth: 250,
		maxWidth: '90%',
		elevation: 10,
		zIndex: 10,
	},
	title: {
		fontSize: 22,
		fontWeight: 'bold',
		marginBottom: 16,
		color: colors.text,
	},
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
	speedButtonsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		marginTop: 12,
		gap: 8,
	},
	speedButton: {
		flex: 1,
		backgroundColor: colors.primary,
		paddingVertical: 10,
		paddingHorizontal: 10,
		marginHorizontal: 0,
		borderRadius: 6,
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 0, // verhindert, dass Buttons zu breit werden
	},
	speedButtonText: {
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
})

export default EditClipModal
