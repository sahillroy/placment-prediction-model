import { useNavigate } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/Button'

const FEATURES = [
    { icon: '📄', title: 'Upload Your Resume', desc: 'Our parser extracts keywords and computes your ATS score instantly.' },
    { icon: '💻', title: 'Add Coding Handles', desc: 'Share your LeetCode, GitHub, and HackerRank activity.' },
    { icon: '🎯', title: 'Get Your Score', desc: 'Receive a calibrated placement probability and a prioritized action plan.' },
]

export default function Landing() {
    const navigate = useNavigate()
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero */}
            <section className="max-w-2xl mx-auto px-4 py-24 text-center">
                <span className="inline-block bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
                    AI-Powered Placement Intelligence
                </span>
                <h1 className="text-5xl font-bold text-slate-900 leading-tight">
                    Know your <span className="text-indigo-600">placement odds</span> before the season starts
                </h1>
                <p className="mt-4 text-lg text-slate-500">
                    CampusHire Advisor combines your resume, competitive programming profile, and academics into a calibrated placement probability — with a personalized action plan.
                </p>
                <div className="mt-8 flex gap-3 justify-center">
                    <Button size="lg" onClick={() => navigate('/register')}>
                        Analyse My Profile →
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                        Login
                    </Button>
                </div>
            </section>

            {/* How it works */}
            <section className="bg-slate-50 py-16">
                <div className="max-w-4xl mx-auto px-4">
                    <h2 className="text-center text-xl font-semibold text-slate-700 mb-10">How it works</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {FEATURES.map((f) => (
                            <div key={f.title} className="bg-white rounded-2xl border border-slate-100 p-6">
                                <span className="text-3xl">{f.icon}</span>
                                <h3 className="mt-3 font-semibold text-slate-800">{f.title}</h3>
                                <p className="mt-1.5 text-sm text-slate-500">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Sample preview card */}
            <section className="max-w-xl mx-auto px-4 py-16 text-center">
                <div className="relative blur-sm pointer-events-none select-none bg-white rounded-2xl border border-slate-100 p-6">
                    <p className="text-xs text-slate-400 mb-2">Placement Probability</p>
                    <p className="text-6xl font-bold text-indigo-600">72%</p>
                    <p className="text-sm text-slate-400 mt-1">Confidence: 65% – 79%</p>
                </div>
                <p className="mt-4 text-xs text-slate-400">Sample output — your real results after sign up</p>
            </section>
        </div>
    )
}
