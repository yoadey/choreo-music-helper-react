import logo from '@/assets/logo192.png'
import { colors } from '@/constants/tokens'
import { t } from '@/i18n'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Application from 'expo-application'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import React, { ComponentProps } from 'react'
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { ReactNativeLegal } from 'react-native-legal'

type LinkItemProps = {
    icon: ComponentProps<typeof MaterialCommunityIcons>['name']
    label: string
    onPress: () => void
}

const LinkItem = ({ icon, label, onPress }: LinkItemProps) => (
    <Pressable
        style={({ pressed }) => [styles.row, { backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent' }]}
        android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
        onPress={onPress}
        accessibilityRole="link"
    >
        <MaterialCommunityIcons name={icon} size={22} color="#4da6ff" style={styles.iconLeft} />
        <Text style={styles.link}>{label}</Text>
    </Pressable>
)

export default function InfoScreen() {
    const router = useRouter()
    // On the web there is no native application version, the version from app.json is used instead
    const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '?'
    const buildNumber = Application.nativeBuildVersion

    const openLicenses = () => {
        if (Platform.OS === 'web') {
            router.push('/licenses')
        } else {
            ReactNativeLegal.launchLicenseListScreen(t.openSourceLicenses)
        }
    }

    return (
        <View style={styles.screen}>
            <View style={styles.card}>
                <Image source={logo} style={styles.icon} resizeMode="contain" />

                <Text style={styles.appName}>Choreo Music Helper</Text>

                <Text style={styles.description}>
                    {t.appDescription}
                </Text>

                <View style={styles.row}>
                    <Text style={styles.contact}>{t.contact}</Text>
                </View>

                <LinkItem
                    icon="email-outline"
                    label={t.contactUs}
                    onPress={() => Linking.openURL('mailto:info@yoadey.de')}
                />

                <LinkItem
                    icon="file-document-outline"
                    label={t.privacyPolicy}
                    onPress={() =>
                        Linking.openURL(
                            'https://choreohelper.yoadey.de/choreo-music-helper-privacy-policy',
                        )
                    }
                />

                <LinkItem icon="license" label={t.licenses} onPress={() => openLicenses()} />

                <View style={styles.row}>
                    <MaterialCommunityIcons
                        name="information"
                        size={22}
                        color="#ccc"
                        style={styles.iconLeft}
                    />
                    <Text style={styles.version}>
                        {t.version}: {version}
                        {buildNumber ? ` (Build ${buildNumber})` : ''}
                    </Text>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 25,
    },
    icon: {
        width: 91,
        height: 91,
        marginBottom: 20,
        alignSelf: 'center',
    },
    appName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        alignSelf: 'center',
        marginBottom: 20,
    },
    description: {
        color: colors.textMuted,
        fontSize: 15,
        marginBottom: 20,
        textAlign: 'left',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        width: '100%',
    },
    iconLeft: {
        marginRight: 8,
    },
    contact: {
        fontWeight: '600',
        fontSize: 20,
        color: colors.text,
    },
    version: {
        fontSize: 16,
        color: colors.text,
    },
    link: {
        fontSize: 16,
        color: '#4da6ff',
    },
})
