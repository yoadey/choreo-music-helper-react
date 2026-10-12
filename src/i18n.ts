import { getLocales } from 'expo-localization'

const de = {
    songs: 'Songs',
    clips: 'Clips',
    noSongs: 'Noch keine Songs. Öffne eine Audiodatei über das Ordnersymbol.',
    noClips: 'Noch keine Clips definiert!',
    noTrackSelected: 'Kein Song ausgewählt',
    untitledTrack: 'Unbenannter Song',
    untitledClip: 'Unbenannter Clip',
    numberedClip: (n: number) => `Clip ${n}`,
    newClip: 'Neuer Clip',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    cancel: 'Abbrechen',
    ok: 'OK',
    editClip: 'Clip bearbeiten',
    editTrack: 'Song bearbeiten',
    confirmDeleteTrack: (title: string) => `Song „${title}“ mit allen Clips löschen?`,
    confirmDeleteClip: (title: string) => `Clip „${title}“ löschen?`,
    speed: 'Geschwindigkeit',
    overrideClipSpeed: 'Überschreibe Clipgeschwindigkeit',
    preparationTime: 'Vorbereitungszeit',
    leadIn: 'Vorlaufzeit',
    leadOut: 'Nachlaufzeit',
    importFailed: 'Die Datei konnte nicht importiert werden. Wird das Audioformat von diesem Browser unterstützt?',
    fileMissing: 'Die Audiodatei dieses Songs ist auf diesem Gerät nicht mehr vorhanden. Bitte importiere sie erneut.',
    loadFailed: 'Der Song konnte nicht geladen werden. Wird das Audioformat von diesem Browser unterstützt?',
    storageFull: 'Der Speicher des Browsers ist voll. Lösche nicht mehr benötigte Songs.',
    databaseError: 'Die Datenbank konnte nicht geöffnet werden. Bitte lade die Seite neu.',
    otherTabChanged: 'Die App ist in einem anderen Tab geöffnet und hat Daten geändert. Bitte lade diese Seite neu, bevor du weiterarbeitest.',
    musicPlayer: 'Musik',
    share: 'Teilen',
    info: 'Info',
    licenses: 'Lizenzen',
    openSourceLicenses: 'Open-Source-Lizenzen',
    loadingLicenses: 'Lade Lizenzen…',
    licenseType: 'Lizenztyp',
    description: 'Beschreibung',
    contact: 'Kontakt',
    contactUs: 'Kontaktiere uns',
    privacyPolicy: 'Datenschutzerklärung',
    version: 'Version',
    appDescription:
        'Der Choreo Music Helper dient zur Unterstützung beim Einstudieren einer Choreographie auf ein bestimmtes Lied. Er teilt das Lied mittels Clips in kleinere Stücke, die mit unterschiedlicher Geschwindigkeit trainiert werden können.',
}

type Translations = typeof de

const en: Translations = {
    songs: 'Songs',
    clips: 'Clips',
    noSongs: 'No songs yet. Open an audio file with the folder icon.',
    noClips: 'No clips defined yet!',
    noTrackSelected: 'No song selected',
    untitledTrack: 'Untitled song',
    untitledClip: 'Untitled clip',
    numberedClip: (n: number) => `Clip ${n}`,
    newClip: 'New clip',
    delete: 'Delete',
    edit: 'Edit',
    cancel: 'Cancel',
    ok: 'OK',
    editClip: 'Edit clip',
    editTrack: 'Edit song',
    confirmDeleteTrack: (title: string) => `Delete song "${title}" with all clips?`,
    confirmDeleteClip: (title: string) => `Delete clip "${title}"?`,
    speed: 'Speed',
    overrideClipSpeed: 'Override clip speeds',
    preparationTime: 'Preparation time',
    leadIn: 'Lead-in',
    leadOut: 'Lead-out',
    importFailed: 'The file could not be imported. Is the audio format supported by this browser?',
    fileMissing: 'The audio file of this song is no longer available on this device. Please import it again.',
    loadFailed: 'The song could not be loaded. Is the audio format supported by this browser?',
    storageFull: 'The browser storage is full. Delete songs you no longer need.',
    databaseError: 'The database could not be opened. Please reload the page.',
    otherTabChanged: 'The app is open in another tab and changed data. Please reload this page before continuing.',
    musicPlayer: 'Music',
    share: 'Share',
    info: 'Info',
    licenses: 'Licenses',
    openSourceLicenses: 'Open source licenses',
    loadingLicenses: 'Loading licenses…',
    licenseType: 'License type',
    description: 'Description',
    contact: 'Contact',
    contactUs: 'Contact us',
    privacyPolicy: 'Privacy policy',
    version: 'Version',
    appDescription:
        'The Choreo Music Helper supports you in rehearsing a choreography to a song. It splits the song into clips which can be practiced at different speeds.',
}

const languageTag = getLocales()[0]?.languageTag ?? 'en'

export const isGerman = languageTag.toLowerCase().startsWith('de')

export const t: Translations = isGerman ? de : en

if (typeof document !== 'undefined') {
    document.documentElement.lang = isGerman ? 'de' : 'en'
}
