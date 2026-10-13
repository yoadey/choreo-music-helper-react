import { t } from '@/i18n'
import { Alert, Platform } from 'react-native'

// react-native-web does not implement Alert, so the browser dialogs are used on the web.

// Browsers drop dialogs of hidden pages (e.g. an import that finished in a background tab): such messages
// are shown when the app is visible again
const deferredMessages: string[] = []

if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return
        deferredMessages.splice(0).forEach((message) => window.alert(message))
    })
}

export const showMessage = (message: string) => {
    if (Platform.OS !== 'web') {
        Alert.alert('', message)
    } else if (document.visibilityState !== 'visible') {
        deferredMessages.push(message)
    } else {
        window.alert(message)
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
