import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { DIET_LABEL } from '../lib/keywords';
import { isPlausibleBarcode } from '../lib/openfoodfacts';
import { useProfile } from '../lib/profile';
import { colors, fonts, radius, spacing } from '../lib/theme';
import { DIET_KEYS } from '../lib/types';

/** A bolti polcokon EAN/UPC van; a QR-t szándékosan nem nézzük. */
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'itf14'] as const;

export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const [permission, requestPermission] = useCameraPermissions();

  // A kamerát csak fókuszban tartjuk életben: a termékoldal mögött fölöslegesen
  // pörgetné az akkumulátort, és visszatéréskor amúgy is újra kell indulnia.
  const [isFocused, setIsFocused] = useState(false);
  const handledRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      // A zárat itt oldjuk fel, nem a beolvasásnál: így egy beolvasás pontosan
      // egy termékoldalt nyit, és visszalépés után újra lehet olvasni.
      handledRef.current = false;
      return () => setIsFocused(false);
    }, []),
  );

  const handleScan = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (handledRef.current) return;
      if (!isPlausibleBarcode(data)) return;

      handledRef.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: '/product/[code]', params: { code: data } });
    },
    [router],
  );

  const activeDiets = DIET_KEYS.filter((diet) => profile.diets[diet]);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <StatusBar style="dark" />
        <Text style={styles.permissionTitle}>Kamera kell hozzá</Text>
        <Text style={styles.permissionBody}>
          A vonalkód beolvasásához hozzáférés kell a kamerához. A képeket nem mentjük és nem küldjük
          sehova – csak a beolvasott számsort kérdezzük le az adatbázisból.
        </Text>
        <PrimaryButton
          label={permission.canAskAgain ? 'Kamera engedélyezése' : 'Beállítások megnyitása'}
          onPress={() => {
            if (permission.canAskAgain) void requestPermission();
            else void Linking.openSettings();
          }}
          style={styles.permissionButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          onBarcodeScanned={handleScan}
        />
      )}

      <View style={[styles.overlay, { paddingTop: insets.top + spacing.md }]} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <Text style={styles.title}>Mentes?</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/history')}
              accessibilityRole="button"
              accessibilityLabel="Előzmények, kedvencek és kerülendők"
              style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
            >
              <Text style={styles.gearText}>Listáim</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Szűrők beállítása"
              style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
            >
              <Text style={styles.gearText}>Szűrők</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.hint}>Fordítsd a vonalkódra a keretet</Text>
        </View>

        <View
          style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={() => router.push('/manual')}
            accessibilityRole="button"
            accessibilityLabel="Vonalkód beírása kézzel"
            style={({ pressed }) => [styles.manual, pressed && styles.pressed]}
          >
            <Text style={styles.gearText}>⌨  Kód beírása</Text>
          </Pressable>

          {activeDiets.length > 0 ? (
            <View style={styles.chips}>
              {activeDiets.map((diet) => (
                <View key={diet} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {DIET_LABEL[diet].emoji} {DIET_LABEL[diet].name}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noFilter}>
              Nincs bekapcsolt szűrő – állítsd be a „Szűrők" alatt.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permissionTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
    marginBottom: spacing.md,
  },
  permissionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
  permissionButton: { marginTop: spacing.xl, alignSelf: 'stretch' },

  overlay: { flex: 1, justifyContent: 'space-between' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.onDark },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  gear: {
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  gearText: { color: colors.onDark, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.7 },

  frameWrap: { alignItems: 'center' },
  frame: {
    width: '78%',
    aspectRatio: 1.5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.lg,
  },
  hint: {
    marginTop: spacing.lg,
    color: colors.onDarkMuted,
    fontSize: 14,
  },

  footer: { paddingHorizontal: spacing.lg, alignItems: 'center', gap: spacing.md },
  manual: {
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  chip: {
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipText: { color: colors.onDark, fontSize: 14, fontWeight: '600' },
  noFilter: { color: colors.onDarkMuted, fontSize: 14, textAlign: 'center' },
});
