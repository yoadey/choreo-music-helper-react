import { colors } from '@/constants/tokens'
import { t } from '@/i18n'
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Button, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native'

type LicenseEntry = {
  name: string
  version: string
  type: string
  url?: string
  description?: string
  // Full license text (copyright notice and conditions), which most licenses require to be shipped
  content?: string
}

type LicenseItemProps = {
  id: string
  info: LicenseEntry
  expanded: boolean
  onToggle: (id: string) => void
}

const LicenseItem = React.memo(function LicenseItem({ id, info, expanded, onToggle }: LicenseItemProps) {
  return (
    <View style={styles.item} testID={`license-${info.name}`}>
      <Text style={[styles.text, styles.name]}>
        {info.name} ({info.version})
      </Text>
      <Text style={styles.text}>
        {t.licenseType}: {info.type}
      </Text>
      {info.description && (
        <Text style={styles.text}>
          {t.description}: {info.description}
        </Text>
      )}
      {info.url && (
        <Text style={styles.link} onPress={() => Linking.openURL(info.url!)}>
          {info.url}
        </Text>
      )}
      {info.content && (
        <>
          <Pressable accessibilityRole="button" onPress={() => onToggle(id)}>
            <Text style={styles.link}>{expanded ? t.hideLicenseText : t.showLicenseText}</Text>
          </Pressable>
          {expanded && <Text style={[styles.text, styles.content]}>{info.content}</Text>}
        </>
      )}
    </View>
  )
})

export default function LicensesScreen() {
  const [licenses, setLicenses] = useState<[string, LicenseEntry][] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // Kept here, the virtualized list unmounts entries that are scrolled far out of view
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  const toggle = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    import('../../assets/licenses.json')
      .then((module) => {
        const data = (module.default ?? module) as unknown as Record<string, LicenseEntry>
        setLicenses(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)))
      })
      .catch((err) => {
        console.error('Could not load the licenses', err)
        setFailed(true)
      })
  }, [attempt])

  if (failed) {
    return (
      <View style={styles.screen}>
        <Text style={[styles.text, styles.item]}>{t.licensesUnavailable}</Text>
        <Button
          title={t.retry}
          onPress={() => {
            setFailed(false)
            setAttempt((value) => value + 1)
          }}
        />
      </View>
    )
  }

  if (!licenses) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator />
        <Text style={styles.text}>{t.loadingLicenses}</Text>
      </View>
    )
  }

  return (
    // Virtualized: there are more than a thousand entries
    <FlatList
      style={styles.screen}
      data={licenses}
      keyExtractor={([key]) => key}
      initialNumToRender={20}
      ListHeaderComponent={<Text style={[styles.text, styles.title]}>{t.openSourceLicenses}</Text>}
      extraData={expanded}
      renderItem={({ item: [id, info] }) => (
        <LicenseItem id={id} info={info} expanded={expanded.has(id)} onToggle={toggle} />
      )}
    />
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: colors.background },
  text: { color: colors.text },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  item: { marginBottom: 24 },
  name: { fontWeight: 'bold', fontSize: 16 },
  link: { color: '#4da6ff' },
  content: { marginTop: 8, fontSize: 12 },
})
