'use client';

import { MapPin } from 'lucide-react';
import { STADIUM_ZONES, NO_ZONE_ID, getRowsForZone, getSeatsForRow } from '@/data/stadium-seats';

interface Props {
  zone: string;
  row: string;
  seat: string;
  onChange: (zone: string, row: string, seat: string) => void;
  compact?: boolean;
}

export default function SeatPicker({ zone, row, seat, onChange, compact }: Props) {
  const rows = zone && zone !== NO_ZONE_ID ? getRowsForZone(zone) : [];
  const seats = zone && zone !== NO_ZONE_ID && row ? getSeatsForRow(zone, row) : [];

  const handleZoneChange = (newZone: string) => {
    onChange(newZone, '', '');
  };

  const handleRowChange = (newRow: string) => {
    onChange(zone, newRow, '');
  };

  const handleSeatChange = (newSeat: string) => {
    onChange(zone, row, newSeat);
  };

  const labelClass = compact
    ? 'text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1'
    : 'label';

  return (
    <div>
      <label className={`${labelClass} flex items-center gap-1`}>
        <MapPin size={compact ? 10 : 12} /> Ubicación en el Estadio
      </label>
      <div className={`grid ${compact ? 'grid-cols-3 gap-2' : 'grid-cols-3 gap-3'}`}>
        <div>
          <select
            className="input text-xs"
            value={zone}
            onChange={e => handleZoneChange(e.target.value)}
          >
            <option value="">-- Zona --</option>
            <option value={NO_ZONE_ID}>Sin Zona</option>
            {STADIUM_ZONES.map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            className="input text-xs"
            value={row}
            onChange={e => handleRowChange(e.target.value)}
            disabled={!zone || zone === NO_ZONE_ID || rows.length === 0}
          >
            <option value="">-- Fila --</option>
            {rows.map(r => (
              <option key={r.label} value={r.label}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            className="input text-xs"
            value={seat}
            onChange={e => handleSeatChange(e.target.value)}
            disabled={!row || seats.length === 0}
          >
            <option value="">-- Asiento --</option>
            {seats.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
