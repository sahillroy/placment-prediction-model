import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import type { User } from '@/types'

interface AuthCredentials { email: string; password: string }
interface RegisterCredentials extends AuthCredentials { name: string }

// Simple in-memory auth state (replace with context/zustand if needed)
const authState = { user: null as User | null }

export function useAuth() {
    const [user, setUser] = useState<User | null>(authState.user)
    const navigate = useNavigate()

    const loginMutation = useMutation({
        mutationFn: (creds: AuthCredentials) =>
            api.post<{ user: User }>('/auth/login', creds).then((r) => r.data),
        onSuccess: ({ user }) => {
            authState.user = user
            setUser(user)
            navigate('/profile')
        },
    })

    const registerMutation = useMutation({
        mutationFn: (creds: RegisterCredentials) =>
            api.post<{ user: User }>('/auth/register', creds).then((r) => r.data),
        onSuccess: ({ user }) => {
            authState.user = user
            setUser(user)
            navigate('/profile')
        },
    })

    const logout = useCallback(async () => {
        await api.post('/auth/logout')
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
