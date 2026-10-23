type StatCardProps = {
  label: string;
  value: string;
  note: string;
  icon: string;
  tone?: 'violet' | 'blue' | 'mint' | 'amber';
};

export function StatCard({ label, value, note, icon, tone = 'violet' }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`} aria-hidden="true">{icon}</div>
      <div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
      <span className="stat-more" aria-hidden="true">···</span>
    </article>
  );
}
