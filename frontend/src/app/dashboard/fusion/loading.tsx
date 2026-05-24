export default function FusionLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-warm-dark/10 rounded-xl" />
      <div className="h-64 bg-warm-dark/5 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-warm-dark/5 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
