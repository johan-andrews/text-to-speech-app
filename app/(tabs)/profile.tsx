import { useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable, Linking, TextInput, Modal } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { AlertModal } from '@/components/ui/AppModal'
import SettingsRow from '@/components/ui/SettingsRow'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { logoutRevenueCat } from '@/lib/purchases'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { adjustBrightness } from '@/lib/utils'
import {
    ACCENT,
    ACCENT_BORDER,
    BG,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    TEXT_TERTIARY,
    ERROR,
    BORDER,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { demoUser } from '@/lib/mockData'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'

export default function ProfileScreen() {
    const insets = useSafeAreaInsets()
    const { isPremium, customerInfo } = useSubscription()
    const { data: profile } = useProfile()
    const { mutateAsync: updateProfile } = useUpdateProfile()

    const [signOutModal, setSignOutModal] = useState(false)
    const [signingOut, setSigningOut] = useState(false)
    const [errorModal, setErrorModal] = useState<string | null>(null)

    // Name editing states
    const [editNameModal, setEditNameModal] = useState(false)
    const [newName, setNewName] = useState('')
    const [savingName, setSavingName] = useState(false)

    // About modal state
    const [aboutModal, setAboutModal] = useState(false)

    const expiryMs = customerInfo?.entitlements.active['premium']?.expirationDate
    const expiryDate = expiryMs
        ? new Date(expiryMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : null

    async function handleSignOut() {
        setSigningOut(true)
        try {
            track('logout')
            await logoutRevenueCat()
            const { error } = await supabase.auth.signOut()
            if (error) throw error
        } catch (e: any) {
            setErrorModal(e?.message ?? 'Sign out failed. Please try again.')
        } finally {
            setSigningOut(false)
        }
    }

    async function handleSaveName() {
        if (!newName.trim()) return
        setSavingName(true)
        try {
            await updateProfile(newName.trim())
            setEditNameModal(false)
        } catch (e: any) {
            setErrorModal(e?.message ?? 'Failed to update name.')
        } finally {
            setSavingName(false)
        }
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: BG }}
            contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + 16 }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Account Header with About */}
            <View style={s.headerRow}>
                <Text style={s.headerTitle}>Account</Text>
                <Pressable onPress={() => setAboutModal(true)} style={s.aboutBtn}>
                    <Ionicons name="information-circle-outline" size={18} color={ACCENT} />
                    <Text style={s.aboutBtnText}>About App</Text>
                </Pressable>
            </View>

            <Card style={s.heroCard}>
                <LinearGradient
                    colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />

                <View style={s.avatarWrap}>
                    <Text style={s.avatarText}>{profile?.initials ?? demoUser.initials}</Text>
                    {isPremium && (
                        <View style={s.premiumDot}>
                            <Ionicons name="sparkles" size={10} color="#fff" />
                        </View>
                    )}
                </View>

                <View style={s.nameContainer}>
                    <Text style={s.name}>{profile?.fullName ?? demoUser.fullName}</Text>
                    <Pressable
                        onPress={() => {
                            setNewName(profile?.fullName ?? '')
                            setEditNameModal(true)
                        }}
                        style={s.editNameBtn}
                        hitSlop={8}
                    >
                        <Ionicons name="create-outline" size={18} color={ACCENT} />
                    </Pressable>
                </View>
                
                <Text style={s.metaText}>{profile?.email ?? demoUser.email}</Text>
            </Card>

            {isPremium ? (
                <Card style={[s.planCard, { borderColor: ACCENT_BORDER }]}>
                    <View style={s.planTop}>
                        <View style={s.planBadge}>
                            <Ionicons name="sparkles" size={11} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.planTitle}>Premium Active</Text>
                            <Text style={s.planSub}>{expiryDate ? `Renews ${expiryDate}` : 'Billing cycle active'}</Text>
                        </View>
                        <Pressable onPress={() => router.push('/upgrade')} style={s.manageBtn}>
                            <Text style={s.manageBtnText}>Manage</Text>
                        </Pressable>
                    </View>
                </Card>
            ) : (
                <Pressable onPress={() => router.push('/upgrade')} style={s.upgradeCard}>
                    <LinearGradient
                        colors={[ACCENT, adjustBrightness(ACCENT, -18)]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <Ionicons name="sparkles" size={15} color="#fff" />
                    <View style={{ flex: 1 }}>
                        <Text style={s.upgradeTitle}>Upgrade to Premium</Text>
                        <Text style={s.upgradeSub}>Advanced controls, faster support, and all modules.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.8)" />
                </Pressable>
            )}

            <Text style={s.sectionTitle}>Settings</Text>
            <Card compact style={s.sectionCard}>
                <SettingsRow icon="settings-outline" label="Preferences" onPress={() => router.push('/settings')} />
                <SettingsRow icon="help-buoy-outline" label="Support" onPress={() => router.push('/support')} />
                <SettingsRow icon="document-text-outline" label="Privacy Policy" onPress={() => router.push('/privacy')} />
                <SettingsRow icon="shield-checkmark-outline" label="Terms of Service" onPress={() => router.push('/terms')} last={true} />
            </Card>

            <Pressable
                onPress={() => setSignOutModal(true)}
                disabled={signingOut}
                style={({ pressed }) => [s.signOutBtn, (pressed || signingOut) && { opacity: 0.72 }]}
            >
                <Ionicons name="log-out-outline" size={17} color={ERROR} />
                <Text style={s.signOutText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
            </Pressable>

            <Text style={{ textAlign: 'center', color: '#64748B', fontSize: 13, marginTop: 24, marginBottom: 8 }}>
              developed bu: <Text style={{ color: '#8B5CF6', fontWeight: '600', textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://www.linkedin.com/in/johan-andrews-3b9505312/')}>johan_andrews</Text>
            </Text>

            {/* Edit Name Modal */}
            <Modal visible={editNameModal} transparent animationType="fade" onRequestClose={() => setEditNameModal(false)}>
                <View style={s.modalOverlay}>
                    <View style={s.modalContent}>
                        <Text style={s.modalTitle}>Edit Display Name</Text>
                        <TextInput
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Enter your name"
                            placeholderTextColor="#94A3B8"
                            style={s.textInput}
                            autoFocus
                        />
                        <View style={s.modalButtons}>
                            <Pressable onPress={() => setEditNameModal(false)} style={s.cancelBtn}>
                                <Text style={s.cancelBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={handleSaveName} disabled={savingName || !newName.trim()} style={s.saveBtn}>
                                <Text style={s.saveBtnText}>{savingName ? 'Saving...' : 'Save'}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* About Modal */}
            <Modal visible={aboutModal} transparent animationType="fade" onRequestClose={() => setAboutModal(false)}>
                <View style={s.modalOverlay}>
                    <View style={s.aboutModalContent}>
                        <View style={s.aboutHeader}>
                            <Ionicons name="sparkles" size={24} color="#8B5CF6" />
                            <Text style={s.aboutTitle}>VoiceFlow AI</Text>
                            <Text style={s.aboutVersion}>Version 1.0.0</Text>
                        </View>
                        
                        <ScrollView style={s.aboutScroll} showsVerticalScrollIndicator={false}>
                            <Text style={s.aboutSectionHeading}>Features & Core Modules:</Text>
                            
                            <View style={s.featureRow}>
                                <Text style={s.featureEmoji}>🎙️</Text>
                                <Text style={s.featureText}>Real-time speech transcription powered by leading models (Groq, Whisper, Deepgram).</Text>
                            </View>

                            <View style={s.featureRow}>
                                <Text style={s.featureEmoji}>✨</Text>
                                <Text style={s.featureText}>Advanced AI grammar cleanups and stutter/pause removal powered by Llama-3.</Text>
                            </View>

                            <View style={s.featureRow}>
                                <Text style={s.featureEmoji}>🤖</Text>
                                <Text style={s.featureText}>Conversational Voice Assistant Agent for hands-free intelligence and direct query answering.</Text>
                            </View>

                            <View style={s.featureRow}>
                                <Text style={s.featureEmoji}>🗂️</Text>
                                <Text style={s.featureText}>Safe, local-first database logs & rolling history of your last 10 dictations.</Text>
                            </View>

                            <View style={s.featureRow}>
                                <Text style={s.featureEmoji}>🗣️</Text>
                                <Text style={s.featureText}>Custom Vocabulary Training to teach the AI brand names and custom industry terminology.</Text>
                            </View>

                            <View style={s.featureRow}>
                                <Text style={s.featureEmoji}>📴</Text>
                                <Text style={s.featureText}>Local On-Device fallback option when you have no cellular signal or internet connection.</Text>
                            </View>
                        </ScrollView>

                        <Pressable onPress={() => setAboutModal(false)} style={s.aboutCloseBtn}>
                            <Text style={s.aboutCloseBtnText}>Close</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <AlertModal
                visible={signOutModal}
                title="Sign out"
                message="You will be signed out of your account."
                buttons={[
                    { text: 'Cancel', style: 'cancel', onPress: () => setSignOutModal(false) },
                    { text: 'Sign out', style: 'destructive', onPress: () => { setSignOutModal(false); handleSignOut() } },
                ]}
                onDismiss={() => setSignOutModal(false)}
            />

            <AlertModal
                visible={!!errorModal}
                title="Error"
                message={errorModal ?? ''}
                buttons={[{ text: 'OK', onPress: () => setErrorModal(null) }]}
                onDismiss={() => setErrorModal(null)}
            />
        </ScrollView>
    )
}

const s = StyleSheet.create({
    container: { paddingHorizontal: 20, gap: 14 },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: TEXT_PRIMARY,
        letterSpacing: -0.5,
    },
    aboutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 4,
    },
    aboutBtnText: {
        color: '#8B5CF6',
        fontSize: 12,
        fontWeight: '700',
    },
    heroCard: {
        overflow: 'hidden',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 16,
    },
    avatarWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ACCENT,
        marginBottom: 4,
    },
    avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
    premiumDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 999,
        backgroundColor: ACCENT,
        borderWidth: 2,
        borderColor: BG,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    name: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.4 },
    editNameBtn: {
        padding: 4,
    },
    metaText: { fontSize: 12.5, color: TEXT_SECONDARY },
    planCard: {
        borderWidth: 1,
        paddingVertical: 12,
    },
    planTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    planBadge: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ACCENT,
    },
    planTitle: { color: ACCENT, fontSize: 14.5, fontWeight: '700' },
    planSub: { color: TEXT_SECONDARY, fontSize: 12 },
    manageBtn: {
        borderWidth: 1,
        borderColor: ACCENT_BORDER,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    manageBtnText: { color: ACCENT, fontSize: 12, fontWeight: '600' },
    upgradeCard: {
        minHeight: 66,
        borderRadius: 16,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
    },
    upgradeTitle: { color: '#fff', fontSize: 14.5, fontWeight: '700' },
    upgradeSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: TEXT_TERTIARY,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginTop: 3,
        marginBottom: -4,
    },
    sectionCard: { padding: 0, overflow: 'hidden' },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 10,
    },
    signOutText: { color: ERROR, fontSize: 14, fontWeight: '600' },
    
    // Modal & About Styling
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        gap: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: TEXT_PRIMARY,
    },
    textInput: {
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
        color: TEXT_PRIMARY,
        fontSize: 15,
        backgroundColor: '#F8FAFC',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    cancelBtnText: {
        color: TEXT_SECONDARY,
        fontSize: 14,
        fontWeight: '600',
    },
    saveBtn: {
        backgroundColor: ACCENT,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    
    // About Modal
    aboutModalContent: {
        width: '100%',
        maxHeight: '80%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        gap: 16,
    },
    aboutHeader: {
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: BORDER,
        paddingBottom: 14,
        gap: 4,
    },
    aboutTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: TEXT_PRIMARY,
    },
    aboutVersion: {
        fontSize: 12,
        fontWeight: '600',
        color: TEXT_SECONDARY,
    },
    aboutScroll: {
        flexGrow: 0,
    },
    aboutSectionHeading: {
        fontSize: 13,
        fontWeight: '800',
        color: TEXT_TERTIARY,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    featureRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    featureEmoji: {
        fontSize: 16,
    },
    featureText: {
        flex: 1,
        fontSize: 13,
        color: TEXT_PRIMARY,
        lineHeight: 18,
    },
    aboutCloseBtn: {
        backgroundColor: ACCENT,
        borderRadius: 8,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
    },
    aboutCloseBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
})
