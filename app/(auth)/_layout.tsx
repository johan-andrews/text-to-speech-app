import { Stack } from 'expo-router'
import { BG } from '@/lib/theme'

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#FFFFFF' } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  )
}
