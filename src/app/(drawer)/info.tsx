import { colors } from '@/constants/tokens';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ReactNativeLegal } from 'react-native-legal';



export default function InfoScreen() {
    const router = useRouter()
    const version = Application.nativeApplicationVersion ?? 'Unbekannt';
    const buildNumber = Application.nativeBuildVersion ?? 'N/A';

    const LinkItem = ({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) => (
        <Pressable
            style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent' }
            ]}
            android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
            onPress={onPress}
        >
            <Ionicons name={icon} size={22} color="#4da6ff" style={styles.iconLeft} />
            <Text style={styles.link}>{label}</Text>
        </Pressable>
    );

    const openLicenses = () => {
        if (Platform.OS === 'web') {
            router.push('/licenses');
        } else {
            ReactNativeLegal.launchLicenseListScreen('Open Source Licenses');
        }
    }

    return (
        <View style={styles.screen}>
            <View style={styles.card}>

                <Image
                    source={require('../../../assets/logo192.png')}
                    style={styles.icon}
                    resizeMode="contain"
                />

                <Text style={styles.appName}>Choreo Music Helper</Text>

                <Text style={styles.description}>
                    Der Choreo Music Helper dient zur Unterstützung beim Einstudizeren einer
                    Choreographie auf ein bestimmtes Lied. Er teilt das Lied mittels Clips in kleinere
                    Stücke, die mit unterschiedlicher Geschwindigkeit trainiert werden können.
                </Text>


                <View style={styles.row}>
                    <Text style={styles.contact}>Kontakt</Text>
                </View>

                <LinkItem
                    icon="mail-outline"
                    label="Kontaktiere uns"
                    onPress={() => Linking.openURL('mailto:info@yoadey.de')}
                />

                <LinkItem
                    icon="document-text-outline"
                    label="Datenschutzerklärung"
                    onPress={() => Linking.openURL('https://choreohelper.yoadey.de/choreo-music-helper-privacy-policy')}
                />

                <LinkItem
                    icon="receipt-outline"
                    label="Lizenzen"
                    onPress={() => openLicenses()}
                />

                <View style={styles.row}>
                    <Ionicons name="information-circle-outline" size={22} color="#ccc" style={styles.iconLeft} />
                    <Text style={styles.version}>Version: {version} (Build {buildNumber})</Text>
                </View>

            </View>
        </View>
    );
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
        fontWeight: 600,
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
});
