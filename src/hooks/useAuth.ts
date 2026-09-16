import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getCurrentSession, onSessionChange, signInWithEmail, signOut, signUpWithEmail } from '../lib/auth'
import { createProfile, getProfile } from '../lib/profiles'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Profile } from '../types/profile'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const existing = await getProfile(userId)
      if (existing) {
        setProfile(existing)
        return
      }

      const { data } = await supabase.auth.getUser()
      const metadataUsername = data.user?.user_metadata.username
      if (typeof metadataUsername === 'string' && metadataUsername.trim()) {
        setProfile(await createProfile(userId, metadataUsername.trim()))
      } else {
        setProfile(null)
      }
    } catch (profileError) {
      setProfile(null)
      setError(profileError instanceof Error ? profileError.message : '读取用户资料失败。')
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let active = true
    getCurrentSession()
      .then((currentSession) => {
        if (!active) return
        setSession(currentSession)
        if (currentSession?.user) void loadProfile(currentSession.user.id)
      })
      .catch((sessionError: unknown) => {
        if (active) setError(sessionError instanceof Error ? sessionError.message : '读取登录状态失败。')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const subscription = onSessionChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
      setError(null)
      if (nextSession?.user) void loadProfile(nextSession.user.id)
      else setProfile(null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const login = async (email: string, password: string) => {
    setError(null)
    try {
      const data = await signInWithEmail(email, password)
      setSession(data.session)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登录失败。')
      throw loginError
    }
  }

  const register = async (email: string, password: string, username: string) => {
    setError(null)
    try {
      const data = await signUpWithEmail(email, password, username)
      setSession(data.session)
      // Profile creation is handled in the single session-change path. With
      // email confirmation enabled, that happens after the confirmed login.
      return { needsEmailConfirmation: Boolean(data.user && !data.session) }
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : '注册失败。')
      throw registerError
    }
  }

  const logout = async () => {
    setError(null)
    try {
      await signOut()
      setSession(null)
      setProfile(null)
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : '登出失败。')
      throw logoutError
    }
  }

  return {
    configured: isSupabaseConfigured,
    error,
    loading,
    login,
    logout,
    profile,
    register,
    session,
    setError,
  }
}
