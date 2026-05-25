export default function JourneyMapLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-warm-dark/10 rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 bg-warm-dark/5 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
