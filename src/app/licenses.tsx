import { colors } from '@/constants/tokens'
import { t } from '@/i18n'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native'

type LicenseEntry = {
  name: string
  version: string
  type: string
  url?: string
  description?: string
}

const textStyle = { color: colors.text }

export default function LicensesScreen() {
  const [licenses, setLicenses] = useState<Record<string, LicenseEntry> | null>(null)

  useEffect(() => {
    import('../../assets/licenses.json')
      .then((module) => setLicenses((module.default ?? module) as unknown as Record<string, LicenseEntry>))
      .catch((err) => console.error('Could not load the licenses', err))
  }, [])

  if (!licenses) {
    return (
      <View style={{ padding: 16, flex: 1, backgroundColor: colors.background }}>
        <ActivityIndicator />
        <Text style={textStyle}>{t.loadingLicenses}</Text>
      </View>
    )
  }

  const sortedEntries = Object.entries(licenses).sort(([a], [b]) => a.localeCompare(b))

  return (
    <ScrollView style={{ padding: 16, backgroundColor: colors.background }}>
      <Text style={[textStyle, { fontSize: 24, fontWeight: 'bold', marginBottom: 16 }]}>{t.openSourceLicenses}</Text>

      {sortedEntries.map(([key, info]) => (
        <View key={key} style={{ marginBottom: 24 }}>
          <Text style={[textStyle, { fontWeight: 'bold', fontSize: 16 }]}>
            {info.name} ({info.version})
          </Text>
          <Text style={textStyle}>
            {t.licenseType}: {info.type}
          </Text>
          {info.description && (
            <Text style={textStyle}>
              {t.description}: {info.description}
            </Text>
          )}
          {info.url && (
            <Text style={{ color: '#4da6ff' }} onPress={() => Linking.openURL(info.url!)}>
              {info.url}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  )
}
