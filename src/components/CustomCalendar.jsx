import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  'СІЧЕНЬ', 'ЛЮТИЙ', 'БЕРЕЗЕНЬ', 'КВІТЕНЬ', 'ТРАВЕНЬ', 'ЧЕРВЕНЬ',
  'ЛИПЕНЬ', 'СЕРПЕНЬ', 'ВЕРЕСЕНЬ', 'ЖОВТЕНЬ', 'ЛИСТОПАД', 'ГРУДЕНЬ'
];

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

export const CustomCalendar = ({ globalDates, setGlobalDates }) => {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Для вирівнювання по днях тижня (неділя = 0)
  const blanks = Array((firstDay + 6) % 7).fill(null);

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };
  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="bg-[#FAF3E3] rounded-2xl shadow-lg p-4 md:p-6 w-full transition-all duration-300">
      <div className="flex justify-between items-center mb-4 px-2">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
          {MONTHS[month]} {year}
        </span>
        <div className="flex gap-2">
          <button onClick={handlePrev} className="hover:scale-110 transition-transform">
            <ChevronLeft size={18} className="cursor-pointer text-gray-500" />
          </button>
          <button onClick={handleNext} className="hover:scale-110 transition-transform">
            <ChevronRight size={18} className="cursor-pointer text-gray-500" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-2 text-xs text-center text-gray-400 font-bold">
        <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Нд</div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {blanks.map((_, i) => <div key={i}></div>)}
        {days.map((day) => {
          const isSel =
            globalDates.start === day && globalDates.month === month && globalDates.year === year ||
            globalDates.end === day && globalDates.month === month && globalDates.year === year ||
            (globalDates.start && globalDates.end &&
              globalDates.month === month && globalDates.year === year &&
              day > globalDates.start && day < globalDates.end);
          return (
            <button
              key={day}
              onClick={() => {
                let next = { ...globalDates, month, year };
                if (!globalDates.start || globalDates.end || globalDates.month !== month || globalDates.year !== year) next = { start: day, end: null, month, year };
                else {
                  if (day < globalDates.start) next = { start: day, end: null, month, year };
                  else next.end = day;
                }
                setGlobalDates(next);
              }}
              className={`h-9 w-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-150
                ${isSel ? 'bg-primary text-white shadow' : 'bg-white text-gray-700 hover:bg-[#F5EBDD]'}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};
