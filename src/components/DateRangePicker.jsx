import React, { useEffect, useState, useRef } from "react";

const MONTHS = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

function pad(n) { return n < 10 ? `0${n}` : n; }

export default function DateRangePicker({ value, onChange }) {
  const [show, setShow] = useState(false);
  const [activeField, setActiveField] = useState('start');
  const [viewMonth, setViewMonth] = useState((value?.start && value.start.month) || (new Date()).getMonth());
  const [viewYear, setViewYear] = useState((value?.start && value.start.year) || (new Date()).getFullYear());
  const ref = useRef();

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setShow(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (day, month, year) => {
    let next = { ...value };
    if (activeField === 'start') {
      next = { start: { day, month, year }, end: null };
      setActiveField('end');
    } else {
      if (!next.start || new Date(year, month, day) < new Date(next.start.year, next.start.month, next.start.day)) {
        next = { start: { day, month, year }, end: null };
        setActiveField('end');
      } else {
        next.end = { day, month, year };
        setShow(false);
      }
    }
    onChange(next);
  };

  const format = (d) => d ? `${pad(d.day)}.${pad(d.month+1)}.${d.year}` : '';

  // Календарна сітка
  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const blanks = Array((firstDay + 6) % 7).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Дні попереднього місяця
  const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  const prevDays = getDaysInMonth(prevMonth, prevYear);
  const prevMonthDays = blanks.map((_, i) => prevDays - blanks.length + i + 1);

  // Дні наступного місяця
  const totalCells = blanks.length + days.length;
  const nextMonthDays = Array((7 - (totalCells % 7)) % 7).fill(null).map((_, i) => i + 1);

  // Вибір діапазону
  const isInRange = (d, m, y) => {
    if (!value?.start || !value?.end) return false;
    const start = new Date(value.start.year, value.start.month, value.start.day);
    const end = new Date(value.end.year, value.end.month, value.end.day);
    const curr = new Date(y, m, d);
    return curr >= start && curr <= end;
  };
  const isSelected = (d, m, y) => {
    return (value?.start && d === value.start.day && m === value.start.month && y === value.start.year) ||
           (value?.end && d === value.end.day && m === value.end.month && y === value.end.year);
  };

  const isToday = (d, m, y) => {
    const today = new Date();
    return d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
  };

  return (
    <div className="relative" ref={ref}>
      <div className="flex gap-2 items-center flex-nowrap whitespace-nowrap">
        <button
          className="px-4 py-2 rounded-full border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#131C4E]/30 transition-all duration-200 border-[rgba(19,28,78,0.3)] bg-[#F9F9FF] text-[#131C4E] hover:bg-[#131C4E] hover:text-white"
          onClick={() => { setShow(true); setActiveField('start'); }}
        >
          {format(value?.start) || 'Дата з'}
        </button>
        <span className="text-slate-400 font-bold">—</span>
        <button
          className="px-4 py-2 rounded-full border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#131C4E]/30 transition-all duration-200 border-[rgba(19,28,78,0.3)] bg-[#F9F9FF] text-[#131C4E] hover:bg-[#131C4E] hover:text-white disabled:opacity-50"
          onClick={() => { setShow(true); setActiveField('end'); }}
          disabled={!value?.start}
        >
          {format(value?.end) || 'Дата по'}
        </button>
      </div>
      {show && (
        <div className="absolute z-[80] mt-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl border shadow-2xl p-4 w-80 animate-in fade-in text-[#131C4E]" style={{ borderColor: 'rgba(19,28,78,0.15)' }}>
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => {
              if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
              else setViewMonth(viewMonth - 1);
            }} className="p-1 rounded hover:bg-slate-100 text-[#131C4E]">
              &lt;
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-[#131C4E]">{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={() => {
              if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
              else setViewMonth(viewMonth + 1);
            }} className="p-1 rounded hover:bg-slate-100 text-[#131C4E]">
              &gt;
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1 text-[11px] text-center text-slate-400 font-bold">
            <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Нд</div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {prevMonthDays.map((d, i) => (
              <button key={"prev"+i} className="h-8 w-8 text-xs text-slate-300 bg-transparent cursor-not-allowed" disabled>{d}</button>
            ))}
            {days.map((d) => (
              <button
                key={d}
                onClick={() => handleSelect(d, viewMonth, viewYear)}
                className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-150
                  ${isSelected(d, viewMonth, viewYear)
                    ? 'bg-[#131C4E] text-white shadow ring-2 ring-[#131C4E]/30'
                    : isInRange(d, viewMonth, viewYear)
                      ? 'bg-[#131C4E]/10 text-[#131C4E] border border-[#131C4E]/20 hover:bg-[#131C4E]/20'
                      : isToday(d, viewMonth, viewYear)
                        ? 'bg-[#F9F9FF] text-[#131C4E] border-2 border-[#131C4E] hover:bg-[#131C4E]/10 hover:scale-105'
                        : 'bg-white text-slate-700 hover:bg-[#F9F9FF] hover:scale-105 hover:text-[#131C4E] border border-slate-200'}
                `}
                title={isToday(d, viewMonth, viewYear) ? 'Сьогодні' : undefined}
              >{d}</button>
            ))}
            {nextMonthDays.map((d, i) => (
              <button key={"next"+i} className="h-8 w-8 text-xs text-slate-300 bg-transparent cursor-not-allowed" disabled>{d}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
