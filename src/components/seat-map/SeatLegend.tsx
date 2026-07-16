export default function SeatLegend() {
  const items = [
    { label: 'Available',     colorClass: 'seat-regular',      color: '#059669' },
    { label: 'Premium',       colorClass: 'seat-premium',      color: '#2563eb' },
    { label: 'Recliner',      colorClass: 'seat-recliner',     color: '#7c3aed' },
    { label: 'Selected',      colorClass: 'seat-selected',     color: '#dc2626' },
    { label: 'Held by you',   colorClass: 'seat-locked-own',   color: '#f97316' },
    { label: 'Held by others',colorClass: 'seat-locked-other', color: '#ca8a04' },
    { label: 'Booked',        colorClass: 'seat-booked',       color: '#4b5563' },
  ];

  return (
    <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
      {items.map(({ label, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, borderRadius: 3, background: color }} />
          <span style={{ color: '#8b8b9a', fontSize: 12 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}
