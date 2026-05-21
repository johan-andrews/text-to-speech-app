import { useEffect } from 'react'
import { router } from 'expo-router'

export default function LoginScreenRedirect() {
  useEffect(() => {
    router.replace('/')
  }, [])

  return null
}
