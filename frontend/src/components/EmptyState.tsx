'use client';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon = '📦', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-warm-dark mb-2">{title}</h3>
      {description && (
        <p className="text-warm-muted text-sm mb-6 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium
                     hover:brightness-110 active:scale-95 transition-all shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}