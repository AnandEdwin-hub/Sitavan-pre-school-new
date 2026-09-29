import React from 'react';

interface TimeInputProps {
  value: string; // "HH:mm" in 24-hour format
  onChange: (value: string) => void;
  disabled?: boolean;
}

const selectClass =
  'h-9 rounded-md border border-input bg-transparent px-2 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

const TimeInput = ({ value, onChange, disabled }: TimeInputProps) => {
  const [hStr, mStr] = (value || '09:00').split(':');
  const h24 = Number(hStr) || 0;
  const minute = Number(mStr) || 0;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;

  const emit = (h12: number, m: number, p: string) => {
    let h = h12 % 12;
    if (p === 'PM') h += 12;
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  return (
    <div className="flex items-center gap-2">
      <select className={selectClass} value={hour12} disabled={disabled}
        onChange={(e) => emit(Number(e.target.value), minute, period)}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span>:</span>
      <select className={selectClass} value={minute} disabled={disabled}
        onChange={(e) => emit(hour12, Number(e.target.value), period)}>
        {Array.from({ length: 60 }, (_, i) => i).map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
        ))}
      </select>
      <select className={selectClass} value={period} disabled={disabled}
        onChange={(e) => emit(hour12, minute, e.target.value)}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

export default TimeInput;