import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseCache, ProductCache } from './cache';
import { FavoriteMap, parseFavorites } from './favorites';
import { HistoryEntry, parseHistory } from './history';
import { NoteMap, parseNotes } from './notes';
import { DEFAULT_DIETS, DEFAULT_PROFILE, DIET_KEYS, Profile } from './types';

const PROFILE_KEY = 'mentes.profile.v1';
const HISTORY_KEY = 'mentes.history.v1';
const NOTES_KEY = 'mentes.notes.v1';
const CACHE_KEY = 'mentes.cache.v1';
const FAVORITES_KEY = 'mentes.favorites.v1';

/**
 * Hiányzó vagy sérült mentésnél az alapértelmezett profillal indulunk, soha nem
 * dobunk hibát – a beállítás elvesztése nem ér egy összeomlást.
 *
 * Kétféle alakot olvas: a **régit**, ahol a mentés maga volt a kapcsolók
 * térképe (`{"gluten":true,…}`), és a mostanit, ahol a kapcsolók a `diets`
 * kulcs alatt vannak. A régi mentés némán átkerül az új alakra.
 */
export function parseProfile(raw: string | null): Profile {
  const fallback = (): Profile => ({
    diets: { ...DEFAULT_DIETS },
    strict: DEFAULT_PROFILE.strict,
    speak: DEFAULT_PROFILE.speak,
  });

  if (!raw) return fallback();

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== 'object' || parsed === null) return fallback();

    const profile = fallback();
    const legacy = typeof parsed.diets !== 'object' || parsed.diets === null;
    const switches = (legacy ? parsed : (parsed.diets as Record<string, unknown>)) ?? {};

    for (const key of DIET_KEYS) {
      if (typeof switches[key] === 'boolean') profile.diets[key] = switches[key] as boolean;
    }
    if (typeof parsed.strict === 'boolean') profile.strict = parsed.strict;
    if (typeof parsed.speak === 'boolean') profile.speak = parsed.speak;

    return profile;
  } catch {
    return fallback();
  }
}

export async function loadProfile(): Promise<Profile> {
  try {
    return parseProfile(await AsyncStorage.getItem(PROFILE_KEY));
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // A mentés bukása nem befolyásolja a futó munkamenetet.
  }
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    return parseHistory(await AsyncStorage.getItem(HISTORY_KEY));
  } catch {
    return [];
  }
}

export async function saveHistory(history: HistoryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // lásd fent
  }
}

export async function loadNotes(): Promise<NoteMap> {
  try {
    return parseNotes(await AsyncStorage.getItem(NOTES_KEY));
  } catch {
    return {};
  }
}

export async function saveNotes(notes: NoteMap): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    // lásd fent
  }
}

export async function loadCache(): Promise<ProductCache> {
  try {
    return parseCache(await AsyncStorage.getItem(CACHE_KEY));
  } catch {
    return {};
  }
}

export async function saveCache(cache: ProductCache): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // lásd fent
  }
}

export async function loadFavorites(): Promise<FavoriteMap> {
  try {
    return parseFavorites(await AsyncStorage.getItem(FAVORITES_KEY));
  } catch {
    return {};
  }
}

export async function saveFavorites(favorites: FavoriteMap): Promise<void> {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // lásd fent
  }
}
