import { colors, fontSize } from '@/constants/tokens'
import { getInstallPlatform, promptInstall, useInstallState } from '@/helpers/pwa'
import { t } from '@/i18n'
import { isUiScaleSupported, setUiScale, UI_SCALES, useUiScale } from '@/store/settings'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import React, { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <View style={styles.card}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
)

const DisplaySize = () => {
    const scale = useUiScale()
    return (
        <>
            <Text style={styles.label}>{t.displaySize}</Text>
            <View style={styles.segments} accessibilityRole="radiogroup">
                {UI_SCALES.map((value) => {
                    const selected = value === scale
                    return (
                        <Pressable
                            key={value}
                            testID={`ui-scale-${value}`}
                            style={[styles.segment, selected && styles.segmentSelected]}
                            onPress={() => setUiScale(value)}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                        >
                            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                                {Math.round(value * 100)} %
                            </Text>
                        </Pressable>
                    )
                })}
            </View>
            <Text style={styles.hint}>{t.displaySizeHint}</Text>
            {getInstallPlatform() === 'desktop' && <Text style={styles.hint}>{t.displaySizeDesktopHint}</Text>}
        </>
    )
}

const manualInstructions = {
    ios: t.installIos,
    android: t.installAndroid,
    desktop: t.installDesktop,
}

const Install = () => {
    const state = useInstallState()
    if (state === 'installed') {
        return (
            <View style={styles.row}>
                <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
                <Text style={styles.text} testID="install-state">{t.installed}</Text>
            </View>
        )
    }
    return (
        <>
            <Text style={styles.hint}>{t.installBenefits}</Text>
            {state === 'prompt' ? (
                <Pressable
                    style={styles.button}
                    onPress={() => promptInstall()}
                    accessibilityRole="button"
                    testID="install-app"
                >
                    <MaterialCommunityIcons name="download" size={20} color={colors.text} />
                    <Text style={styles.buttonText}>{t.installButton}</Text>
                </Pressable>
            ) : (
                <View style={styles.row}>
                    <MaterialCommunityIcons name="information-outline" size={22} color={colors.textMuted} />
                    <Text style={[styles.text, styles.flex]} testID="install-state">
                        {manualInstructions[getInstallPlatform()]}
                    </Text>
                </View>
            )}
        </>
    )
}

export default function SettingsScreen() {
    const installState = useInstallState()
    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            {isUiScaleSupported && (
                <Section title={t.display}>
                    <DisplaySize />
                </Section>
            )}
            {installState !== 'unsupported' && (
                <Section title={t.installApp}>
                    <Install />
                </Section>
            )}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 16,
        gap: 16,
        alignItems: 'center',
    },
    card: {
        width: '100%',
        maxWidth: 500,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        gap: 10,
    },
    sectionTitle: {
        fontSize: fontSize.base,
        fontWeight: '600',
        color: colors.text,
    },
    label: {
        fontSize: fontSize.sm,
        color: colors.text,
    },
    text: {
        fontSize: 15,
        color: colors.text,
    },
    flex: {
        flex: 1,
    },
    hint: {
        fontSize: 14,
        color: colors.textMuted,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    segments: {
        flexDirection: 'row',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.maximumTrackTintColor,
        overflow: 'hidden',
    },
    segment: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
    },
    segmentSelected: {
        backgroundColor: colors.primary,
    },
    segmentText: {
        fontSize: 14,
        color: colors.textMuted,
    },
    segmentTextSelected: {
        color: colors.text,
        fontWeight: '600',
    },
    button: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
    },
    buttonText: {
        color: colors.text,
        fontWeight: 'bold',
        fontSize: 16,
    },
})
