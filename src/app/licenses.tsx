import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';

type LicenseEntry = {
  name: string;
  version: string;
  type: string;
  url?: string;
  content?: string;
  description?: string;
};

export default function LicensesScreen() {
  const [licenses, setLicenses] = useState<Record<string, LicenseEntry> | null>(null);

  useEffect(() => {
    import('../../assets/licenses.json') // ggf. Pfad anpassen
      .then((module) => {
        const data = module.default ?? module;
        setLicenses(data as any);
      })
      .catch((err) => {
        console.error('Fehler beim Laden der Lizenzdaten:', err);
      });
  }, []);

  if (!licenses) {
    return (
      <View style={{ padding: 16 }}>
        <ActivityIndicator />
        <Text>Lade Lizenzen…</Text>
      </View>
    );
  }

  const sortedEntries = Object.entries(licenses).sort(([a], [b]) => a.localeCompare(b));

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Open Source Lizenzen
      </Text>

      {sortedEntries.map(([key, info]) => (
        <View key={key} style={{ marginBottom: 24 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
            {info.name} ({info.version})
          </Text>
          <Text>Lizenztyp: {info.type}</Text>
          {info.description && <Text>Beschreibung: {info.description}</Text>}
          {info.url && (
            <Text
              style={{ color: 'blue' }}
              onPress={() => Linking.openURL(info.url!)}
            >
              {info.url}
            </Text>
          )}
          {info.content && Platform.OS !== 'web' && (
            <Text
              style={{
                marginTop: 8,
                fontSize: 12,
                fontStyle: 'italic',
              }}
              numberOfLines={10}
            >
              {info.content.trim()}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
