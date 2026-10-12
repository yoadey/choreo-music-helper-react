import { t } from '@/i18n'
import { Alert, Platform } from 'react-native'

// react-native-web does not implement Alert, so the browser dialogs are used on the web.

export const showMessage = (message: string) => {
    if (Platform.OS === 'web') {
        window.alert(message)
    } else {
        Alert.alert('', message)
    }
}

export const confirmAction = (message: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
        return Promise.resolve(window.confirm(message))
    }
    return new Promise((resolve) => {
        Alert.alert('', message, [
            { text: t.cancel, style: 'cancel', onPress: () => resolve(false) },
            { text: t.delete, style: 'destructive', onPress: () => resolve(true) },
        ])
    })
}
