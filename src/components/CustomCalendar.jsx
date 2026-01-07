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
    <div className="bg-[#FAF3E3] rounded-lg border border-[#F3E5C8] p-2 md:p-3 w-full max-w-xs shadow-sm transition-all duration-300">
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
          {MONTHS[month]} {year}
        </span>
        <div className="flex gap-1">
          <button onClick={handlePrev} className="hover:scale-110 transition-transform p-1 rounded hover:bg-[#F3E5C8]">
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <button onClick={handleNext} className="hover:scale-110 transition-transform p-1 rounded hover:bg-[#F3E5C8]">
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1 text-[11px] text-center text-gray-400 font-bold">
        <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Нд</div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {blanks.map((_, i) => <div key={i}></div>)}
        {days.map((day) => {
          const isSel =
            globalDates.start?.day === day && globalDates.start?.month === month && globalDates.start?.year === year ||
            globalDates.end?.day === day && globalDates.end?.month === month && globalDates.end?.year === year ||
            (globalDates.start && globalDates.end &&
              globalDates.start?.month === month && globalDates.start?.year === year &&
              globalDates.end?.month === month && globalDates.end?.year === year &&
              day > globalDates.start?.day && day < globalDates.end?.day);
          return (
            <button
              key={day}
              onClick={() => {
                const newDate = { day, month, year };
                let next = { ...globalDates };
                
                if (!globalDates.start || globalDates.end) {
                  // New selection: set start only
                  next = { start: newDate, end: null };
                } else {
                  // Extending range: compare dates
                  const currentStart = globalDates.start;
                  const currentDay = `${currentStart.year}-${currentStart.month}-${currentStart.day}`;
                  const newDay = `${year}-${month}-${day}`;
                  
                  if (newDay < currentDay) {
                    // Click before start date
                    next = { start: newDate, end: null };
                  } else {
                    // Click after or on start date
                    next = { start: currentStart, end: newDate };
                  }
                }
                setGlobalDates(next);
              }}
              className={`h-8 w-8 flex items-center justify-center rounded-md text-xs font-bold transition-all duration-150
                ${isSel ? 'bg-slate-900 text-white shadow' : 'bg-white text-gray-700 hover:bg-[#F5EBDD] border border-[#F3E5C8]'}
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
