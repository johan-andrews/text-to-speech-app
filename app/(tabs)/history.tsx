import React, { useState, useMemo } from 'react'
import { View, StyleSheet, FlatList, TextInput, Pressable, ScrollView, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import TranscriptionCard from '@/components/TranscriptionCard'

import { useDictationHistory, useToggleStar, useDeleteSession, DictationSession } from '@/hooks/useDictationHistory'
import { BACKGROUND, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, ACCENT, BORDER } from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'

type FilterType = 'all' | 'starred' | 'groq' | 'deepgram' | 'openai' | 'native'

const FILTER_COLORS: Record<FilterType, string> = {
  all: '#8B5CF6',
  starred: '#F59E0B',
  groq: '#10B981',
  deepgram: '#3B82F6',
  openai: '#6366F1',
  native: '#EC4899',
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data: history = [], refetch, isRefetching } = useDictationHistory()
  const { mutate: toggleStar } = useToggleStar()
  const { mutate: deleteSession } = useDeleteSession()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const handleToggleStar = (session: DictationSession) => {
    toggleStar({ id: session.id, is_starred: !session.is_starred })
  }

  const handleCardPress = (session: DictationSession) => {
    router.push(`/session/${session.id}`)
  }

  // Filter and search history
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // 1. Search Query filter
      const matchesSearch =
        (item.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.cleaned_text?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.raw_text?.toLowerCase() || '').includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      // 2. Tab Filter
      if (activeFilter === 'starred') return item.is_starred
      if (activeFilter === 'groq') return item.provider?.toLowerCase().includes('groq')
      if (activeFilter === 'deepgram') return item.provider?.toLowerCase().includes('deepgram')
      if (activeFilter === 'openai') return item.provider?.toLowerCase().includes('openai')
      if (activeFilter === 'native') return item.provider?.toLowerCase().includes('native')

      return true
    })
  }, [history, searchQuery, activeFilter])

  const activeColor = FILTER_COLORS[activeFilter]

  const renderFilterChip = (filter: FilterType, label: string, icon: string) => {
    const isActive = activeFilter === filter
    const color = FILTER_COLORS[filter]
    return (
      <Pressable
        key={filter}
        onPress={() => setActiveFilter(filter)}
        style={[
          s.chip,
          isActive && { backgroundColor: `${color}18`, borderColor: color },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={13}
          color={isActive ? color : TEXT_SECONDARY}
          style={{ marginRight: 4 }}
        />
        <Text style={[s.chipText, isActive && { color, fontWeight: '700' }]}>{label}</Text>
      </Pressable>
    )
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header with gradient accent */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <Text style={s.title}>History</Text>
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeText}>{history.length}</Text>
          </View>
        </View>
        <View style={[s.headerAccent, { backgroundColor: activeColor }]} />
      </View>

      {/* Search Bar */}
      <View style={s.searchContainer}>
        <Ionicons name="search" size={18} color={activeColor} style={s.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search dictations…"
          placeholderTextColor="#94A3B8"
          style={s.searchInput}
          clearButtonMode="while-editing"
          selectionColor={activeColor}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={TEXT_SECONDARY} />
          </Pressable>
        )}
      </View>

      {/* Filter Row */}
      <View style={s.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {renderFilterChip('all', 'All', 'grid-outline')}
          {renderFilterChip('starred', 'Starred', 'star')}
          {renderFilterChip('groq', 'Groq', 'flash-outline')}
          {renderFilterChip('deepgram', 'Deepgram', 'pulse-outline')}
          {renderFilterChip('openai', 'OpenAI', 'sparkles-outline')}
          {renderFilterChip('native', 'Native', 'phone-portrait-outline')}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TranscriptionCard
            session={item}
            onPress={() => handleCardPress(item)}
            onStar={() => handleToggleStar(item)}
            onDelete={() => deleteSession(item.id)}
          />
        )}
        contentContainerStyle={[s.listContent, { paddingBottom: TAB_BAR_CLEARANCE + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={activeColor} />
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <View style={[s.emptyIconCircle, { backgroundColor: `${activeColor}14` }]}>
              <Ionicons name="mic-outline" size={36} color={activeColor} />
            </View>
            <Text style={s.emptyTitle}>No dictations yet</Text>
            <Text style={s.emptySubtitle}>Tap the mic tab to record and transcribe your voice.</Text>
          </View>
        }
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAccent: {
    height: 3,
    borderRadius: 2,
    marginTop: 10,
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: TEXT_PRIMARY,
    fontSize: 14,
  },
  filterContainer: {
    marginVertical: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: {
    backgroundColor: 'rgba(96,165,250,0.15)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 19,
  },
})
