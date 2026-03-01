// ===========================================================================
// API FETCHERS — All platform stat fetchers with proper endpoints & fallbacks
// ===========================================================================
// Last verified:  2026-03-01
//
// LeetCode active days strategy:
//   1. Solved counts    → faisalshohag.vercel.app  (fast, reliable)
//   2. Active days      → LeetCode official GraphQL (always works, no auth needed)
//      submissionCalendar is a JSON {epoch_seconds: count} → count unique days
//
// GitHub:
//   - Yearly contributions → jogruber API (scrapes contribution graph)
//   - Public events: GitHub truncates payload so commit count isn't reliable;
//     we use yearlyContributions as the activity metric instead
//
// Codeforces: official API (always reliable)
// CodeChef:   graceful skip (all free APIs terminated as of 2025)
// ===========================================================================

// ─── LeetCode ────────────────────────────────────────────────────────────────
export interface LeetCodeStats {
    totalSolved: number
    easySolved: number
    mediumSolved: number
    hardSolved: number
    activeDays: number      // unique days with at least 1 submission in past year
    ranking: number
    username: string
}

async function safeFetch(url: string, timeout = 15000): Promise<Response | null> {
    try {
        const res = await fetch(url, {
            signal: AbortSignal.timeout(timeout),
            headers: { Accept: 'application/json' },
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

/** Count active days from LeetCode submissionCalendar (official GraphQL).
 *  submissionCalendar is a JSON string: { "1700000000": 3, "1700086400": 1, ... }
 *  Keys are UNIX epoch seconds. We count unique calendar days in the past 365 days.
 */
function countActiveDaysFromCalendar(submissionCalendar: string | Record<string, number>): number {
    try {
        const cal: Record<string, number> =
            typeof submissionCalendar === 'string'
                ? JSON.parse(submissionCalendar)
                : submissionCalendar
        const cutoff = Date.now() / 1000 - 365 * 24 * 3600
        const days = new Set<string>()
        for (const ts of Object.keys(cal)) {
            if (Number(ts) >= cutoff) {
                // Convert epoch to YYYY-MM-DD to deduplicate properly
                const d = new Date(Number(ts) * 1000)
                days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
            }
        }
        return days.size
    } catch {
        return 0
    }
}

/** Fetch LeetCode active days via the official LeetCode GraphQL endpoint.
 *  No authentication required for public profiles.
 *  Returns the submissionCalendar JSON from which we count active days.
 */
async function fetchLeetCodeActiveDays(username: string): Promise<number> {
    const currentYear = new Date().getFullYear()
    const prevYear = currentYear - 1

    // Fetch both current and previous year in parallel so we get a full 365-day window
    const gql = (year: number) =>
        fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Referer: 'https://leetcode.com',
                'User-Agent': 'Mozilla/5.0',
            },
            body: JSON.stringify({
                operationName: 'userProfileCalendar',
                query: `query userProfileCalendar($username: String!, $year: Int) {
                    matchedUser(username: $username) {
                        userCalendar(year: $year) {
                            totalActiveDays
                            submissionCalendar
                        }
                    }
                }`,
                variables: { username, year },
            }),
            signal: AbortSignal.timeout(18000),
        }).catch(() => null)

    const [curRes, prevRes] = await Promise.all([gql(currentYear), gql(prevYear)])

    let activeDays = 0

    // Helper to extract data from a GraphQL response
    const extract = async (res: Response | null) => {
        if (!res || !res.ok) return null
        try {
            const json = await res.json()
            return json?.data?.matchedUser?.userCalendar ?? null
        } catch { return null }
    }

    const [curCal, prevCal] = await Promise.all([extract(curRes), extract(prevRes)])

    // Prefer totalActiveDays from current year if the API provides it
    if (curCal?.totalActiveDays && curCal.totalActiveDays > 0) {
        activeDays = curCal.totalActiveDays
    } else {
        // Count from submissionCalendar across both years (last 365 days)
        const allEntries: Record<string, number> = {}
        for (const cal of [curCal, prevCal]) {
            if (cal?.submissionCalendar) {
                const parsed =
                    typeof cal.submissionCalendar === 'string'
                        ? JSON.parse(cal.submissionCalendar)
                        : cal.submissionCalendar
                Object.assign(allEntries, parsed)
            }
        }
        activeDays = countActiveDaysFromCalendar(allEntries)
    }

    return activeDays
}

export async function fetchLeetCodeStats(username: string): Promise<LeetCodeStats | null> {
    if (!username?.trim()) return null
    const u = username.trim()

    // ── Fetch solved counts (faisalshohag) + active days (LC GraphQL) in parallel ──
    const [primaryRes, activeDays] = await Promise.all([
        safeFetch(`https://leetcode-api-faisalshohag.vercel.app/${u}`, 18000),
        fetchLeetCodeActiveDays(u),
    ])
    const primaryData = await safeJson(primaryRes)

    if (primaryData && !primaryData.errors && typeof primaryData.totalSolved === 'number') {
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

    // ── Fallback: alfa-leetcode-api ──
    const BASE = 'https://alfa-leetcode-api.onrender.com'
    const [profileRes, solvedRes] = await Promise.all([
        safeFetch(`${BASE}/${u}`, 20000),
        safeFetch(`${BASE}/${u}/solved`, 20000),
    ])

    const profileData = await safeJson(profileRes)
    if (!profileData || profileData.errors) return null  // username not found

    const solvedData = await safeJson(solvedRes)

    return {
        totalSolved: solvedData?.solvedProblem || 0,
        easySolved: solvedData?.easySolved || 0,
        mediumSolved: solvedData?.mediumSolved || 0,
        hardSolved: solvedData?.hardSolved || 0,
        activeDays,          // already fetched from GraphQL
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
    yearlyContributions: number  // total activity in past 365 days (green squares on profile)
    recentCommits: number        // approximation from events (best-effort)
    username: string
    name: string | null
}

export async function fetchGithubStats(username: string): Promise<GithubStats | null> {
    if (!username?.trim()) return null
    const u = username.trim()
    try {
        const [userRes, reposRes, contribRes] = await Promise.all([
            safeFetch(`https://api.github.com/users/${u}`, 10000),
            safeFetch(`https://api.github.com/users/${u}/repos?per_page=100&sort=updated`, 10000),
            safeFetch(`https://github-contributions-api.jogruber.de/v4/${u}?y=last`, 14000),
        ])

        const userData = await safeJson(userRes)
        if (!userData || userData.message === 'Not Found') return null

        // Stars across all repos
        let totalStars = 0
        const reposData = await safeJson(reposRes)
        if (Array.isArray(reposData)) {
            totalStars = reposData.reduce(
                (s: number, r: { stargazers_count?: number }) => s + (r.stargazers_count || 0),
                0,
            )
        }

        // Yearly contributions from jogruber (sums all contribution days in past year)
        let yearlyContributions = 0
        const contribData = await safeJson(contribRes)
        if (contribData?.contributions) {
            yearlyContributions = contribData.contributions.reduce(
                (s: number, d: { count: number }) => s + (d.count || 0),
                0,
            )
        }

        // GitHub Events API truncates commit data — use yearlyContributions as proxy
        // recentCommits = contributions in last 30 days (from jogruber daily array)
        let recentCommits = 0
        if (Array.isArray(contribData?.contributions)) {
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - 30)
            recentCommits = contribData.contributions
                .filter((d: { date: string }) => new Date(d.date) >= cutoff)
                .reduce((s: number, d: { count: number }) => s + (d.count || 0), 0)
        }

        return {
            public_repos: userData.public_repos || 0,
            followers: userData.followers || 0,
            following: userData.following || 0,
            totalStars,
            yearlyContributions,
            recentCommits,
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
