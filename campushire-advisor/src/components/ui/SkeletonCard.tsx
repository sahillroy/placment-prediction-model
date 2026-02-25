export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />
    )
}

export function ResultsSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-6">
                <SkeletonCard className="h-64" />
                <SkeletonCard className="h-80" />
            </div>
            <div className="flex flex-col gap-6">
                <SkeletonCard className="h-40" />
                <SkeletonCard className="h-48" />
                <SkeletonCard className="h-48" />
            </div>
        </div>
    )
}
