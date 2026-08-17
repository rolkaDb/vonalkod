import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { Segmented, SegmentedOption } from '../components/Segmented';
import { listByKind } from '../lib/favorites';
import { formatScanDate } from '../lib/format';
import { filterByDiet, HistoryEntry, searchEntries } from '../lib/history';
import { DIET_LABEL } from '../lib/keywords';
import { useLibrary } from '../lib/library';
import { hasVerdict } from '../lib/notes';
import { useProfile } from '../lib/profile';
import { colors, fonts, radius, spacing, verdictStyles } from '../lib/theme';
import { DIET_KEYS, DietKey } from '../lib/types';

type Tab = 'history' | 'favorite' | 'avoid';

const TABS: SegmentedOption<Tab>[] = [
  { value: 'history', label: 'Előzmények' },
  { value: 'favorite', label: '★ Kedvencek', activeColor: verdictStyles.safe.fg },
  { value: 'avoid', label: '⊘ Kerülendők', activeColor: verdictStyles.unsafe.fg },
];

const EMPTY: Record<Tab, { title: string; body: string }> = {
  history: {
    title: 'Még nincs semmi',
    body: 'Amit beolvasol, itt gyűlik. A lista offline is megmarad, így a bolti polc előtt nem kell újra szkennelned, amit már egyszer megnéztél.',
  },
  favorite: {
    title: 'Nincs kedvenced',
    body: 'A termékoldalon a „★ Kedvenc" gombbal tudsz ide felvenni, amit rendszeresen veszel.',
  },
  avoid: {
    title: 'Üres a lista',
    body: 'A termékoldalon a „⊘ Kerülendő" gombbal jelölheted azt, amiről már tudod, hogy nem jó neked.',
  },
};

export default function HistoryScreen() {
  const router = useRouter();
  const { history, notes, favorites, clearHistory } = useLibrary();
  const { profile } = useProfile();
  const [tab, setTab] = useState<Tab>('history');
  const [dietFilter, setDietFilter] = useState<DietKey | null>(null);
  const [query, setQuery] = useState('');

  // Csak a bekapcsolt szűrőkre kínálunk gombot – 16 közül 14 sosem használt
  // gomb csak elveszi a helyet.
  const filterable = DIET_KEYS.filter((diet) => profile.diets[diet]);

  const base: HistoryEntry[] =
    tab === 'history' ? history : listByKind(favorites, tab === 'favorite' ? 'favorite' : 'avoid');
  const items = searchEntries(filterByDiet(base, dietFilter), query, notes);

  const renderItem = ({ item }: { item: HistoryEntry }) => {
    const style = verdictStyles[item.verdict];
    const note = notes[item.code];
    const title = note?.name.trim() || item.name || 'Névtelen termék';
    const marked = favorites[item.code];

    return (
      <Pressable
        onPress={() => router.push({ pathname: '/product/[code]', params: { code: item.code } })}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="contain" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Text style={styles.thumbEmptyText}>?</Text>
          </View>
        )}

        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {tab === 'history' && marked ? `${marked.kind === 'favorite' ? '★ ' : '⊘ '}${title}` : title}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {[item.brand, formatScanDate(item.scannedAt)].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <View style={styles.rowRight}>
          <View style={[styles.dot, { backgroundColor: style.bg, borderColor: style.fg }]}>
            <Text style={[styles.dotText, { color: style.fg }]}>{style.emoji}</Text>
          </View>
          {/* Csak akkor jelöljük, ha a jegyzet tényleg befolyásolja az ítéletet –
              a puszta név vagy megjegyzés nem. */}
          {hasVerdict(note) && <Text style={styles.noteMark}>✎ saját</Text>}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.tabs}>
        <Segmented options={TABS} value={tab} onChange={setTab} />
      </View>

      {base.length > 0 && (
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Keresés név, márka vagy vonalkód szerint"
            placeholderTextColor={colors.muted}
            style={styles.search}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      )}

      {filterable.length > 0 && (
        <View style={styles.filterBar}>
          <View style={styles.chips}>
            {filterable.map((diet) => (
              <FilterChip
                key={diet}
                label={`${DIET_LABEL[diet].emoji} ${capitalize(DIET_LABEL[diet].free)}`}
                active={dietFilter === diet}
                onPress={() => setDietFilter(dietFilter === diet ? null : diet)}
              />
            ))}
          </View>

          {dietFilter !== null && (
            <Text style={styles.filterNote}>
              {items.length} a {base.length} termékből
              {'  ·  '}
              <Text style={styles.filterClear} onPress={() => setDietFilter(null)}>
                Szűrő törlése
              </Text>
            </Text>
          )}
        </View>
      )}

      {items.length === 0 ? (
        <View style={styles.empty}>
          {query.trim().length > 0 ? (
            <>
              <Text style={styles.emptyTitle}>Nincs találat</Text>
              <Text style={styles.emptyBody}>
                A „{query.trim()}" keresésre nincs egyezés ezen a listán.
              </Text>
            </>
          ) : dietFilter !== null ? (
            <>
              <Text style={styles.emptyTitle}>Nincs ilyen a listán</Text>
              <Text style={styles.emptyBody}>
                Csak azt mutatjuk, amiről tudjuk, hogy {DIET_LABEL[dietFilter].free}. Amiről nincs
                elég adat, az szándékosan kimarad — a hiányzó adat nem mentesség.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyTitle}>{EMPTY[tab].title}</Text>
              <Text style={styles.emptyBody}>{EMPTY[tab].body}</Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.code}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            tab === 'history' ? (
              <PrimaryButton
                label="Előzmények törlése"
                variant="outline"
                style={styles.clear}
                onPress={() =>
                  Alert.alert(
                    'Előzmények törlése',
                    'A kedvenceid, a kerülendők és a saját jegyzeteid megmaradnak.',
                    [
                      { text: 'Mégsem', style: 'cancel' },
                      { text: 'Törlés', style: 'destructive', onPress: clearHistory },
                    ],
                  )
                }
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  tabs: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.text,
  },
  // A szűrő a fülek alárendeltje, ezért szándékosan könnyebb náluk: nincs
  // kitöltött háttere, kisebb a betűje. Két egyforma pilulasor egymás alatt
  // versenyezne a figyelemért.
  filterBar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  chipTextActive: { color: colors.accent },
  filterNote: { fontSize: 12, color: colors.muted },
  filterClear: { color: colors.accent, fontWeight: '700' },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  emptyBody: { fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  pressed: { opacity: 0.6 },
  thumb: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.bgDeep },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbEmptyText: { fontSize: 20, color: colors.muted, fontWeight: '700' },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: 13, color: colors.muted },
  rowRight: { alignItems: 'center', gap: 2 },
  dot: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { fontSize: 15, fontWeight: '700' },
  noteMark: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  clear: { marginTop: spacing.xl },
});
