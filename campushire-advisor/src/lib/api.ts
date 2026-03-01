import axios from 'axios'

const TOKEN_KEY = 'ch_access_token'

// ─── Token helpers (exported so useAuth.ts can import them) ───────
export function saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY)
}

// ─── Axios instance ───────────────────────────────────────────────
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
    withCredentials: false, // cross-origin cookies are blocked anyway
    headers: { 'Content-Type': 'application/json' },
})

// Attach JWT from localStorage to every request
api.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Handle 401 globally
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err.response?.status
        if (status === 401) {
            clearToken()
            localStorage.removeItem('ch_user')
            window.location.href = '/login'
        }
        return Promise.reject(err)
    },
)

export default api