import { colors, fontSize } from '@/constants/tokens'
import { createBackup, isBackupSupported, pickBackupFile, restoreBackup, restoreErrorMessage } from '@/helpers/backup'
import { confirmAction, showMessage } from '@/helpers/dialogs'
import { getInstallPlatform, promptInstall, useInstallState } from '@/helpers/pwa'
import { isKeepAwakeSupported } from '@/hooks/useKeepAwake'
import { t } from '@/i18n'
import {
    isUiScaleSupported,
    setUiScale,
    UI_SCALES,
    useBackButtonMode,
    useKeepAwakeSetting,
    usePlayerLayout,
    useUiScale,
} from '@/store/settings'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import React, { ReactNode, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <View style={styles.card}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
)

type SegmentedProps<T extends string | number> = {
    options: readonly { value: T; label: string }[]
    value: T
    onChange: (value: T) => void
    testID: string
}

const Segmented = <T extends string | number>({ options, value, onChange, testID }: SegmentedProps<T>) => (
    <View style={styles.segments} accessibilityRole="radiogroup">
        {options.map((option) => {
            const selected = option.value === value
            return (
                <Pressable
                    key={option.value}
                    testID={`${testID}-${option.value}`}
                    style={[styles.segment, selected && styles.segmentSelected]}
                    onPress={() => onChange(option.value)}
                    accessibilityRole="radio"
                    aria-checked={selected}
                >
                    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
                </Pressable>
            )
        })}
    </View>
)

const scaleOptions = UI_SCALES.map((value) => ({ value, label: `${Math.round(value * 100)} %` }))

const Display = () => {
    const scale = useUiScale()
    const [layout, setLayout] = usePlayerLayout()
    return (
        <>
            {isUiScaleSupported && (
                <>
                    <Text style={styles.label}>{t.displaySize}</Text>
                    <Segmented options={scaleOptions} value={scale} onChange={setUiScale} testID="ui-scale" />
                    <Text style={styles.hint}>{t.displaySizeHint}</Text>
                    {getInstallPlatform() === 'desktop' && <Text style={styles.hint}>{t.displaySizeDesktopHint}</Text>}
                </>
            )}
            <Text style={styles.label}>{t.playerLayout}</Text>
            <Segmented
                options={[
                    { value: 'large', label: t.playerLayoutLarge },
                    { value: 'compact', label: t.playerLayoutCompact },
                ]}
                value={layout}
                onChange={setLayout}
                testID="player-layout"
            />
        </>
    )
}

const Playback = () => {
    const [keepAwake, setKeepAwake] = useKeepAwakeSetting()
    const [backButton, setBackButton] = useBackButtonMode()
    return (
        <>
            {isKeepAwakeSupported() && (
                <>
                    <View style={styles.row}>
                        <Text style={[styles.label, styles.flex]}>{t.keepAwake}</Text>
                        <Switch
                            testID="keep-awake"
                            value={keepAwake}
                            onValueChange={setKeepAwake}
                            trackColor={{ true: colors.primary, false: colors.maximumTrackTintColor }}
                            thumbColor={colors.text}
                            // react-native-web colors the thumb of an enabled switch with its own prop
                            {...({ activeThumbColor: colors.text } as object)}
                            accessibilityLabel={t.keepAwake}
                        />
                    </View>
                    <Text style={styles.hint}>{t.keepAwakeHint}</Text>
                </>
            )}
            <Text style={styles.label}>{t.backButton}</Text>
            <Segmented
                options={[
                    { value: 'previous', label: t.backButtonPrevious },
                    { value: 'restart', label: t.backButtonRestart },
                ]}
                value={backButton}
                onChange={setBackButton}
                testID="back-button"
            />
            <Text style={styles.hint}>{backButton === 'restart' ? t.backButtonRestartHint : t.backButtonPreviousHint}</Text>
        </>
    )
}

const Backup = () => {
    const [busy, setBusy] = useState(false)
    const run = async (action: () => Promise<void>) => {
        setBusy(true)
        try {
            await action()
        } finally {
            setBusy(false)
        }
    }
    const create = () =>
        run(async () => {
            try {
                const { songs, missingAudio } = await createBackup()
                showMessage(
                    missingAudio > 0
                        ? `${t.backupCreated(songs)} ${t.backupMissingAudio(missingAudio)}`
                        : t.backupCreated(songs),
                )
            } catch (error) {
                console.warn('Could not create the backup', error)
                showMessage(t.backupFailed)
            }
        })
    const restore = async () => {
        // Not busy while the picker is open: some browsers never report a cancelled picker
        let file: Blob | undefined
        try {
            file = await pickBackupFile()
        } catch (error) {
            console.warn('Could not read the backup file', error)
            showMessage(t.restoreFailed)
            return
        }
        if (!file || !(await confirmAction(t.confirmRestore))) return
        await run(async () => {
            try {
                showMessage(t.restored(await restoreBackup(file)))
            } catch (error) {
                console.warn('Could not restore the backup', error)
                showMessage(restoreErrorMessage(error))
            }
        })
    }
    return (
        <>
            <Text style={styles.hint}>{t.backupHint}</Text>
            <View style={styles.buttons}>
                <Pressable style={styles.button} onPress={create} disabled={busy} accessibilityRole="button" testID="create-backup">
                    <MaterialCommunityIcons name="content-save-outline" size={20} color={colors.text} />
                    <Text style={styles.buttonText}>{t.createBackup}</Text>
                </Pressable>
                <Pressable
                    style={[styles.button, styles.secondaryButton]}
                    onPress={restore}
                    disabled={busy}
                    accessibilityRole="button"
                    testID="restore-backup"
                >
                    <MaterialCommunityIcons name="backup-restore" size={20} color={colors.text} />
                    <Text style={styles.buttonText}>{t.restoreBackup}</Text>
                </Pressable>
                {busy && <ActivityIndicator color={colors.text} />}
            </View>
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
    // While the dialog of the browser is open
    const [installing, setInstalling] = useState(false)
    const install = async () => {
        setInstalling(true)
        await promptInstall()
        setInstalling(false)
    }
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
                    onPress={install}
                    disabled={installing}
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
            <Section title={t.playback}>
                <Playback />
            </Section>
            <Section title={t.display}>
                <Display />
            </Section>
            {isBackupSupported && (
                <Section title={t.backup}>
                    <Backup />
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
    buttons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
    },
    secondaryButton: {
        backgroundColor: colors.modal,
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
