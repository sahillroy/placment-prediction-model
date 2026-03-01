import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
    withCredentials: true, // still send cookies for local dev
    headers: { 'Content-Type': 'application/json' },
})

// ─── Token helpers (localStorage — works cross-domain, no cookie blocking) ───
const TOKEN_KEY = 'ch_access_token'

export function saveToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY)
}

// ─── Request interceptor: attach Bearer token from localStorage ───────────────
// This is the primary auth mechanism for cross-domain (Vercel → Render).
// Cookies are also sent (withCredentials=true) as a fallback for localhost.
api.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ─── Response interceptor: redirect to login on 401 ─────────────────────────
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err.response?.status
        if (status === 401) {
            clearToken()
            window.location.href = '/login'
        }
        return Promise.reject(err)
    },
)

export default api
