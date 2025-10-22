export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-wefit-dark px-4 text-center">
      <div className="max-w-lg rounded-2xl border border-white/10 bg-wefit-dark-muted p-8">
        <div className="mb-4 text-6xl">📡</div>
        <h1 className="text-2xl font-semibold text-wefit-white">You're Offline</h1>
        <p className="mt-4 text-sm text-wefit-grey">
          No internet connection detected. Don't worry - you can still view cached tournament data and score updates will sync when you're back online.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-wefit-green px-6 py-2 text-sm font-medium text-wefit-dark transition-all hover:bg-wefit-green/90"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}
