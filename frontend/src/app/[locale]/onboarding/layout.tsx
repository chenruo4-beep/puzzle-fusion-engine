export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-warm-bg">
      <div className="max-w-[480px] mx-auto min-h-screen bg-warm-bg/50">
        {children}
      </div>
    </main>
  );
}
