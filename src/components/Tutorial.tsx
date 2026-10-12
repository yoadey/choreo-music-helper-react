import React, { ComponentProps, useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { modalStyles, buttonStyles } from '@/styles';
import * as Localization from 'expo-localization';
import { FontAwesome6 } from '@expo/vector-icons';
import { colors } from '@/constants/tokens';
const locale = Localization.getLocales()[0]?.languageTag ?? 'en';
const isGerman = locale.startsWith('de');

const slides = isGerman
  ? [
      {
        icon: 'scissors',
        title: 'Willkommen!',
        text:
          'Teile einen Song mit diesem Knopf an der aktuellen Position in kleinere Tracks. Das Ende eines Tracks wird durch den nächsten Track definiert.'
      },
      {
        icon: 'repeat',
        title: 'Loop',
        text:
          'Erstelle eine Schleife, indem du den Start (A) und den Endtrack (B) auswählst. Solange A und B gesetzt sind, läuft die Schleife. A und B dürfen auch im selben Track liegen.'
      },
      {
        icon: 'pen',
        title: 'Track bearbeiten',
        text:
          'Durch langes Drücken auf einen Track kannst du Namen und Startposition ändern oder ihn löschen.'
      },
      {
        icon: 'clock',
        title: 'Vorbereitungszeit',
        text:
          'Beim Training brauchst du vielleicht Zeit zwischen den Durchläufen. Füge vor und nach der Schleife Zeit hinzu. Die Vorbereitungszeit gilt auch beim Start eines Tracks.'
      }
    ]
  : [
      {
        icon: 'scissors',
        title: 'Welcome!',
        text:
          'Split a song with this button at the current position into smaller tracks. A track has always only a start, the end is defined by the next track.'
      },
      {
        icon: 'repeat',
        title: 'Loop',
        text:
          'Create a loop by selecting the start (A) and the end track (B). As long as there are A and B selected, the loop is active. A and B may be selected on the same track.'
      },
      {
        icon: 'pen',
        title: 'Edit track',
        text:
          'By long pressing on a track you can edit the name and starting position of a track or delete it.'
      },
      {
        icon: 'clock',
        title: 'Preparation time',
        text:
          'If you are training to the song, you probably need some time between each iteration to go back to your starting position. You can add some time before and after the loop to do so. Additionally, the lead-in time also applies if you start a track.'
      }
    ];

export const Tutorial = () => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('tutorialShown').then((val) => {
      if (!val) {
        setVisible(true);
      }
    });
  }, []);

  const handleNext = async () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      setVisible(false);
      await AsyncStorage.setItem('tutorialShown', '1');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={modalStyles.modalContainer}>
        <View style={modalStyles.backdrop} />
        <View style={modalStyles.modal}>
          <FontAwesome6
            name={slides[step].icon as ComponentProps<typeof FontAwesome6>['name']}
            size={48}
            color={colors.text}
            style={{ alignSelf: 'center', marginBottom: 10 }}
          />
          <Text style={modalStyles.title}>{slides[step].title}</Text>
          <Text style={modalStyles.text}>{slides[step].text}</Text>
          <Pressable onPress={handleNext} style={[buttonStyles.button, { marginTop: 20 }]}> 
            <Text style={buttonStyles.buttonText}>{step < slides.length - 1 ? 'Next' : 'Done'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default Tutorial;
