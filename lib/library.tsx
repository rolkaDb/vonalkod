import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { CacheEntry, ProductCache, putEntry } from './cache';
import { FavoriteKind, FavoriteMap, toggleFavorite } from './favorites';
import { addEntry, HistoryEntry } from './history';
import { isBlank, NoteMap, ProductNote } from './notes';
import {
  loadCache,
  loadFavorites,
  loadHistory,
  loadNotes,
  saveCache,
  saveFavorites,
  saveHistory,
  saveNotes,
} from './storage';

type LibraryContextValue = {
  /** Amíg false, az AsyncStorage-ból még nem olvastuk vissza a mentett állapotot. */
  ready: boolean;
  history: HistoryEntry[];
  notes: NoteMap;
  favorites: FavoriteMap;
  recordScan: (entry: HistoryEntry) => void;
  /** Ugyanarra a jelölésre koppintva leveszi, a másikra váltva átsorolja. */
  toggleMark: (entry: HistoryEntry, kind: FavoriteKind) => void;
  saveNote: (note: ProductNote) => void;
  removeNote: (code: string) => void;
  clearHistory: () => void;
  /**
   * A gyorsítótár olvasása **szándékosan függvény, nem állapot**: ha a termékoldal
   * a teljes cache-objektumtól függene, minden mentés újraindítaná a lekérdező
   * effektet, az pedig újabb mentést váltana ki – végtelen ciklus.
   */
  getCached: (code: string) => CacheEntry | null;
  putCached: (code: string, entry: CacheEntry) => void;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [notes, setNotes] = useState<NoteMap>({});
  const [favorites, setFavorites] = useState<FavoriteMap>({});
  const [ready, setReady] = useState(false);

  // A cache-t refben tartjuk, mert csak olvasni akarjuk belőle egy-egy kódot –
  // újrarajzolást nem indokol, viszont mindig a legfrissebb kell.
  const cacheRef = useRef<ProductCache>({});

  useEffect(() => {
    let active = true;
    Promise.all([loadHistory(), loadNotes(), loadCache(), loadFavorites()]).then(
      ([storedHistory, storedNotes, storedCache, storedFavorites]) => {
        if (!active) return;
        setHistory(storedHistory);
        setNotes(storedNotes);
        cacheRef.current = storedCache;
        setFavorites(storedFavorites);
        setReady(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  // Minden művelet a `set…` függvényalakját használja, hogy a callback ne
  // függjön a jelenlegi állapottól – így a termékoldal effektje nem indul újra
  // minden beolvasás után, és nem lesz belőle végtelen ciklus.
  const recordScan = useCallback((entry: HistoryEntry) => {
    setHistory((current) => {
      const next = addEntry(current, entry);
      void saveHistory(next);
      return next;
    });
  }, []);

  const saveNote = useCallback((note: ProductNote) => {
    setNotes((current) => {
      const next = { ...current };
      // Az üresre törölt jegyzet törlést jelent, nem üres rekordot.
      if (isBlank(note)) delete next[note.code];
      else next[note.code] = { ...note, updatedAt: new Date().toISOString() };
      void saveNotes(next);
      return next;
    });
  }, []);

  const removeNote = useCallback((code: string) => {
    setNotes((current) => {
      const next = { ...current };
      delete next[code];
      void saveNotes(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory(() => {
      void saveHistory([]);
      return [];
    });
  }, []);

  const toggleMark = useCallback((entry: HistoryEntry, kind: FavoriteKind) => {
    setFavorites((current) => {
      const next = toggleFavorite(current, entry, kind);
      void saveFavorites(next);
      return next;
    });
  }, []);

  const getCached = useCallback((code: string) => cacheRef.current[code] ?? null, []);

  const putCached = useCallback((code: string, entry: CacheEntry) => {
    cacheRef.current = putEntry(cacheRef.current, code, entry);
    void saveCache(cacheRef.current);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      history,
      notes,
      favorites,
      recordScan,
      toggleMark,
      saveNote,
      removeNote,
      clearHistory,
      getCached,
      putCached,
    }),
    [
      ready,
      history,
      notes,
      favorites,
      recordScan,
      toggleMark,
      saveNote,
      removeNote,
      clearHistory,
      getCached,
      putCached,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('A useLibrary csak LibraryProvider-en belül használható.');
  return context;
}
