/**
 * Returns true/false for a Feature flag.
 * Stub version - always returns the defaultValue since PostHog is disabled.
 */
export function useFeatureFlag(flag: string, defaultValue = false): boolean {
  return defaultValue
}
