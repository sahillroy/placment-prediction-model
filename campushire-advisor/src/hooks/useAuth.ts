import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api, { saveToken, clearToken } from '@/lib/api'
import type { User } from '@/types'

interface AuthCredentials { email: string; password: string }
interface RegisterCredentials extends AuthCredentials { name: string }

// Response type now includes access_token in body (dual-auth strategy)
interface AuthResponse { user: User; access_token: string }

// Simple in-memory auth state — persists for the session
const authState = { user: null as User | null }

// Restore user from localStorage token on page refresh
function restoreUserFromStorage(): User | null {
    try {
        const raw = localStorage.getItem('ch_user')
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(() => {
        // Try authState first (already logged in this session), then localStorage
        return authState.user ?? restoreUserFromStorage()
    })
    const navigate = useNavigate()

    function onAuthSuccess({ user, access_token }: AuthResponse) {
        // 1. Save JWT to localStorage → interceptor adds it as Authorization header
        saveToken(access_token)
        // 2. Persist user info to survive page refresh
        localStorage.setItem('ch_user', JSON.stringify(user))
        // 3. Update in-memory state
        authState.user = user
        setUser(user)
        navigate('/profile')
    }

    const loginMutation = useMutation({
        mutationFn: (creds: AuthCredentials) =>
            api.post<AuthResponse>('/auth/login', creds).then((r) => r.data),
        onSuccess: onAuthSuccess,
    })

    const registerMutation = useMutation({
        mutationFn: (creds: RegisterCredentials) =>
            api.post<AuthResponse>('/auth/register', creds).then((r) => r.data),
        onSuccess: onAuthSuccess,
    })

    const logout = useCallback(async () => {
        try { await api.post('/auth/logout') } catch { /* ignore */ }
        clearToken()
        localStorage.removeItem('ch_user')
        authState.user = null
        setUser(null)
        navigate('/login')
    }, [navigate])

    return {
        user,
        isAuthenticated: !!user,
        login: loginMutation.mutate,
        loginError: loginMutation.error,
        isLoggingIn: loginMutation.isPending,
        register: registerMutation.mutate,
        registerError: registerMutation.error,
        isRegistering: registerMutation.isPending,
        logout,
    }
}
