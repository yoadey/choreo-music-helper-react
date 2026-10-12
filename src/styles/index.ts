import { colors, fontSize } from '@/constants/tokens'
import { StyleSheet } from 'react-native'

export const defaultStyles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
	},
	text: {
		fontSize: fontSize.base,
		color: colors.text,
	},
	label: {
		fontSize: 14,
		color: colors.text,
		textAlign: 'center',
	},
})

export const utilsStyles = StyleSheet.create({
	centeredRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	slider: {
		height: 12,
		borderRadius: 6,
	},
	itemSeparator: {
		borderColor: colors.textMuted,
		borderWidth: StyleSheet.hairlineWidth,
		opacity: 0.3,
	},
	emptyContentText: {
		...defaultStyles.text,
		color: colors.textMuted,
		textAlign: 'center',
		marginTop: 20,
	},
	emptyContentImage: {
		width: 200,
		height: 200,
		alignSelf: 'center',
		marginTop: 40,
		opacity: 0.3,
	},
})


export const modalStyles = StyleSheet.create({
	modalContainer: {
		...defaultStyles.container,
		flex: 1,
		paddingHorizontal: 5,
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative',
		backgroundColor: 'rgba(0, 0, 0, 0)',
	},
	backdrop: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(0, 0, 0, 0.3)',
	},
	modal: {
		backgroundColor: colors.modal,
		padding: 15,
		borderRadius: 12,
		minWidth: 250,
		maxWidth: '95%',
		elevation: 10,
		zIndex: 10,
	},
	title: {
		fontSize: 22,
		fontWeight: 'bold',
		marginBottom: 16,
		color: colors.text,
	},
	container: {
		marginTop: 10,
		marginBottom: 10,
		marginLeft: 5,
		marginRight: 5,
		position: 'relative',
		color: colors.text,
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
})

export const containerStyles = StyleSheet.create({
	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		verticalAlign: 'middle',
	},
})

export const inputStyles = StyleSheet.create({
	input: {
		width: 1,
		flex: 1,
		borderWidth: 0,
		borderBottomWidth: 1,
		borderRadius: 0,
		borderColor: colors.minimumTrackTintColor,
		color: colors.text,
		fontSize: fontSize.base,
		paddingHorizontal: 10,
		paddingVertical: 5,
		marginRight: 10,
	},
})


export const sliderStyles = StyleSheet.create({
	slider: {
		width: 200,
		height: 40,
		margin: 10,
	},
})


export const buttonStyles = StyleSheet.create({
	buttonsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
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
	colorPicker: {
		margin: 10,
	},
	swatchesContainer: {
		alignItems: 'center',
		flexWrap: 'wrap',
		width: 200,
		gap: 10,
	},
	swatchStyle: {
		borderColor: '#AAA',
		borderWidth: 1,
		borderRadius: 20,
		height: 30,
		width: 30,
		margin: 0,
		marginBottom: 0,
		marginHorizontal: 0,
		marginVertical: 0,
	},
})