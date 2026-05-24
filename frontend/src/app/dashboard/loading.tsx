export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-warm-dark/10 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-warm-dark/5 rounded-2xl" />
        ))}
      </div>
      <div className="h-40 bg-warm-dark/5 rounded-2xl" />
      <div className="h-32 bg-warm-dark/5 rounded-2xl" />
    </div>
  );
}
