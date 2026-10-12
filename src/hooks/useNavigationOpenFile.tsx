import { showMessage } from '@/helpers/dialogs'
import { importAudioFile } from '@/helpers/importAudio'
import { t } from '@/i18n'
import { FontAwesome6 } from '@expo/vector-icons'
import { useNavigation } from 'expo-router'
import { useCallback, useLayoutEffect, useState } from 'react'
import { ActivityIndicator, TouchableOpacity } from 'react-native'

/** Adds the "open file" button to the header. */
export const useNavigationOpenFile = () => {
	const navigation = useNavigation()
	const [importing, setImporting] = useState(false)

	const handleChooseFile = useCallback(() => {
		importAudioFile(() => setImporting(true))
			.catch((error) => {
				console.warn('Import failed', error)
				showMessage(t.importFailed)
			})
			.finally(() => setImporting(false))
	}, [])

	useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () =>
				importing ? (
					<ActivityIndicator style={{ paddingRight: 20 }} color="#FFFFFF" />
				) : (
					<TouchableOpacity
						onPress={handleChooseFile}
						style={{ paddingRight: 20 }}
						accessibilityRole="button"
						accessibilityLabel="Open audio file"
						testID="open-file"
					>
						<FontAwesome6 name="folder-open" size={22} color="#FFFFFF" solid />
					</TouchableOpacity>
				),
		})
	}, [navigation, handleChooseFile, importing])
}
