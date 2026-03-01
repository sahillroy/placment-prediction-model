// ===========================================================================
// API FETCHERS — All platform stat fetchers with proper endpoints & fallbacks
// ===========================================================================
// Last verified:  2026-03-01
// LeetCode:       leetcode-api-faisalshohag.vercel.app  (primary — reliable)
//                 alfa-leetcode-api.onrender.com        (fallback — rate-limited sometimes)
// GitHub:         api.github.com                        (official — always works)
// Codeforces:     codeforces.com/api/                   (official — always works)
// CodeChef:       graceful skip (all free APIs terminated)
// ===========================================================================

// ─── LeetCode ────────────────────────────────────────────────────────────────
export interface LeetCodeStats {
    totalSolved: number
    easySolved: number
    mediumSolved: number
    hardSolved: number
    activeDays: number
    ranking: number
    username: string
}

async function safeFetch(url: string, timeout = 15000): Promise<Response | null> {
    try {
        const res = await fetch(url, {
            signal: AbortSignal.timeout(timeout),
            headers: { 'Accept': 'application/json' },
        })
        return res
    } catch {
        return null
    }
}

async function safeJson(res: Response | null): Promise<any | null> {
    if (!res || !res.ok) return null
    try { return await res.json() } catch { return null }
}

export async function fetchLeetCodeStats(username: string): Promise<LeetCodeStats | null> {
    if (!username?.trim()) return null
    const u = username.trim()

    // ── Primary: faisalshohag vercel API (works reliably, single endpoint) ──
    // Returns: { totalSolved, easySolved, mediumSolved, hardSolved, ranking, acceptanceRate, ... }
    const primaryRes = await safeFetch(`https://leetcode-api-faisalshohag.vercel.app/${u}`, 18000)
    const primaryData = await safeJson(primaryRes)

    if (primaryData && !primaryData.errors && typeof primaryData.totalSolved === 'number') {
        // This API returns solved counts directly — fetch active days separately from alfa
        let activeDays = 0
        const calRes = await safeFetch(`https://alfa-leetcode-api.onrender.com/${u}/calendar`, 18000)
        const calData = await safeJson(calRes)
        if (calData && !calData.errors) {
            activeDays = calData.totalActiveDays || 0
            if (!activeDays && calData.submissionCalendar) {
                const cal = typeof calData.submissionCalendar === 'string'
                    ? JSON.parse(calData.submissionCalendar)
                    : calData.submissionCalendar
                activeDays = Object.keys(cal).length
            }
        }

        return {
            totalSolved: primaryData.totalSolved || 0,
            easySolved: primaryData.easySolved || 0,
            mediumSolved: primaryData.mediumSolved || 0,
            hardSolved: primaryData.hardSolved || 0,
            activeDays,
            ranking: primaryData.ranking || 0,
            username: u,
        }
    }

    // ── Fallback: alfa-leetcode-api (slower, sometimes rate-limited) ──
    const BASE = 'https://alfa-leetcode-api.onrender.com'
    const [profileRes, solvedRes, calendarRes] = await Promise.all([
        safeFetch(`${BASE}/${u}`, 20000),
        safeFetch(`${BASE}/${u}/solved`, 20000),
        safeFetch(`${BASE}/${u}/calendar`, 20000),
    ])

    const profileData = await safeJson(profileRes)
    if (!profileData || profileData.errors) return null  // username doesn't exist

    const solvedData = await safeJson(solvedRes)
    const calData = await safeJson(calendarRes)

    let activeDays = 0
    if (calData && !calData.errors) {
        activeDays = calData.totalActiveDays || 0
        if (!activeDays && calData.submissionCalendar) {
            const cal = typeof calData.submissionCalendar === 'string'
                ? JSON.parse(calData.submissionCalendar)
                : calData.submissionCalendar
            activeDays = Object.keys(cal).length
        }
    }

    return {
        totalSolved: solvedData?.solvedProblem || 0,
        easySolved: solvedData?.easySolved || 0,
        mediumSolved: solvedData?.mediumSolved || 0,
        hardSolved: solvedData?.hardSolved || 0,
        activeDays,
        ranking: profileData.ranking || 0,
        username: u,
    }
}

// ─── GitHub ──────────────────────────────────────────────────────────────────
export interface GithubStats {
    public_repos: number
    followers: number
    following: number
    totalStars: number
    username: string
    name: string | null
}

export async function fetchGithubStats(username: string): Promise<GithubStats | null> {
    if (!username?.trim()) return null
    const u = username.trim()
    try {
        const [userRes, reposRes] = await Promise.all([
            safeFetch(`https://api.github.com/users/${u}`, 10000),
            safeFetch(`https://api.github.com/users/${u}/repos?per_page=100&sort=updated`, 10000),
        ])

        const userData = await safeJson(userRes)
        if (!userData || userData.message === 'Not Found') return null

        let totalStars = 0
        const reposData = await safeJson(reposRes)
        if (Array.isArray(reposData)) {
            totalStars = reposData.reduce(
                (s: number, r: { stargazers_count?: number }) => s + (r.stargazers_count || 0),
                0,
            )
        }

        return {
            public_repos: userData.public_repos || 0,
            followers: userData.followers || 0,
            following: userData.following || 0,
            totalStars,
            username: userData.login,
            name: userData.name || null,
        }
    } catch {
        return null
    }
}

// ─── Codeforces — Official API (always reliable) ──────────────────────────────
export interface CodeforcesStats {
    handle: string
    rating: number
    maxRating: number
    rank: string
    maxRank: string
    solvedCount: number
    contribution: number
}

export async function fetchCodeforcesStats(handle: string): Promise<CodeforcesStats | null> {
    if (!handle?.trim()) return null
    const h = handle.trim()
    try {
        const [userRes, statusRes] = await Promise.all([
            safeFetch(`https://codeforces.com/api/user.info?handles=${h}`, 12000),
            safeFetch(
                `https://codeforces.com/api/user.status?handle=${h}&from=1&count=10000`,
                18000,
            ).catch(() => null),
        ])

        const userData = await safeJson(userRes)
        if (!userData || userData.status !== 'OK' || !userData.result?.[0]) return null
        const user = userData.result[0]

        // Count unique accepted problems
        let solvedCount = 0
        const statusData = await safeJson(statusRes)
        if (statusData?.status === 'OK') {
            const solved = new Set<string>()
            for (const sub of statusData.result) {
                if (sub.verdict === 'OK' && sub.problem) {
                    solved.add(`${sub.problem.contestId}-${sub.problem.index}`)
                }
            }
            solvedCount = solved.size
        }

        return {
            handle: user.handle,
            rating: user.rating || 0,
            maxRating: user.maxRating || 0,
            rank: user.rank || 'unrated',
            maxRank: user.maxRank || 'unrated',
            solvedCount,
            contribution: user.contribution || 0,
        }
    } catch {
        return null
    }
}

// ─── CodeChef — best-effort (all free public APIs terminated as of 2025) ──────
export interface CodeChefStats {
    username: string
    currentRating: number
    stars: string
    fullySolved: number
    globalRank: number
    skipped?: boolean
    reason?: string
}

export async function fetchCodeChefStats(username: string): Promise<CodeChefStats> {
    const fallback: CodeChefStats = {
        username,
        currentRating: 0,
        stars: '0★',
        fullySolved: 0,
        globalRank: 0,
        skipped: true,
        reason: 'API unavailable',
    }
    if (!username?.trim()) return { ...fallback, reason: 'No username provided' }

    const apis = [
        `https://codechef-api.vercel.app/handle/${username}`,
        `https://codechef-api-two.vercel.app/${username}`,
    ]

    for (const url of apis) {
        const res = await safeFetch(url, 6000)
        const data = await safeJson(res)
        if (!data || data.success === false || data.message || data.status === 'error') continue
        return {
            username,
            currentRating: data.currentRating || data.rating || 0,
            stars: data.stars || '0★',
            fullySolved: data.fully_solved || data.problemsSolved || 0,
            globalRank: data.globalRank || data.global_rank || 0,
        }
    }

    return fallback
}
