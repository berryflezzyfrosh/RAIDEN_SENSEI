export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-shimmer rounded-lg bg-[#1a1a2e] ${className}`} style={{ backgroundImage: 'linear-gradient(90deg, #1a1a2e 0%, #252540 50%, #1a1a2e 100%)', backgroundSize: '200% 100%' }} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#1e1e30] bg-[#0d0d18] p-5">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1"><Skeleton className="h-4 w-24" /><Skeleton className="mt-2 h-3 w-32" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1e1e30] bg-[#12121f] p-3">
            <Skeleton className="h-3 w-16" /><Skeleton className="mt-2 h-8 w-12" /><Skeleton className="mt-2 h-1 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeviceSkeleton() {
  return (
    <div className="rounded-2xl border border-[#1e1e30] bg-[#0d0d18] p-5">
      <Skeleton className="mb-4 h-8 w-48" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-[#1e1e30] bg-[#12121f] p-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1"><Skeleton className="h-3 w-20" /><Skeleton className="mt-2 h-4 w-28" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CodeSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[#1e1e30] bg-[#0d0d18] p-4">
          <div className="mb-2 flex items-center justify-between"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-4 w-4" /></div>
          <Skeleton className="h-6 w-32" /><Skeleton className="mt-2 h-3 w-40" />
          <div className="mt-3 border-t border-[#1e1e30] pt-2"><Skeleton className="h-3 w-24" /></div>
        </div>
      ))}
    </div>
  );
}
