import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { loadProfile, saveProfile } from './storage';
import { DEFAULT_PROFILE, DietKey, Profile } from './types';

type ProfileContextValue = {
  profile: Profile;
  /** Amíg false, az AsyncStorage-ból még nem olvastuk vissza a mentett állapotot. */
  ready: boolean;
  toggleDiet: (diet: DietKey) => void;
  /** A nem étrendhez kötött kapcsolók (szigorú mód, hangos visszajelzés). */
  toggleOption: (option: 'strict' | 'speak') => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadProfile().then((stored) => {
      if (!active) return;
      setProfile(stored);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggleDiet = useCallback((diet: DietKey) => {
    // A függvényalakot használjuk, hogy a callback ne függjön a profiltól,
    // és a gyors egymás utáni koppintások ne írják felül egymást.
    setProfile((current) => {
      const next = { ...current, diets: { ...current.diets, [diet]: !current.diets[diet] } };
      void saveProfile(next);
      return next;
    });
  }, []);

  const toggleOption = useCallback((option: 'strict' | 'speak') => {
    setProfile((current) => {
      const next = { ...current, [option]: !current[option] };
      void saveProfile(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ profile, ready, toggleDiet, toggleOption }),
    [profile, ready, toggleDiet, toggleOption],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('A useProfile csak ProfileProvider-en belül használható.');
  return context;
}
