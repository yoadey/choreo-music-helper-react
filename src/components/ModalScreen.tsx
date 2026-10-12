import { modalStyles } from '@/styles'
import { useHeaderHeight } from 'expo-router/react-navigation'
import { PropsWithChildren } from 'react'
import { Pressable, View } from 'react-native'

/** Shell of the modal screens: centered content above a backdrop that closes the modal when pressed. */
export const ModalScreen = ({ onClose, children }: PropsWithChildren<{ onClose: () => void }>) => {
    const headerHeight = useHeaderHeight()
    return (
        <View style={[modalStyles.modalContainer, { paddingTop: headerHeight }]}>
            <Pressable style={modalStyles.backdrop} onPress={onClose} accessibilityLabel="Close" />
            {children}
        </View>
    )
}
