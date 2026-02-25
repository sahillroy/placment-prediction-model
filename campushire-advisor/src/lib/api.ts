import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
    withCredentials: true, // send httpOnly cookies
    headers: { 'Content-Type': 'application/json' },
})

// Attach access token from cookie automatically (handled by withCredentials)
// Refresh logic would go here in a response interceptor (V2)
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err.response?.status
        if (status === 401) {
            // token expired — redirect to login
            window.location.href = '/login'
        }
        return Promise.reject(err)
    },
)

export default api
