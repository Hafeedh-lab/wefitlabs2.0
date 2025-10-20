export default function SkeletonBracket() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex gap-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex w-72 flex-col gap-4">
            <div className="h-4 w-24 rounded bg-white/10" />
            {[...Array(3)].map((__, idx) => (
              <div key={idx} className="h-32 rounded-2xl border border-white/5 bg-wefit-dark-muted/60" />
            ))}
          </div>
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-white/5 bg-wefit-dark-muted/60" />
    </div>
  );
}
