// lib/analytics.ts — stub, no PostHog

export const isPostHogEnabled = false
export const posthog = null

export const track = (_event: string, _props?: Record<string, unknown>) => {}
export const identify = (_userId: string) => {}
export const screen = (_name: string) => {}
export const resetIdentity = () => {}
