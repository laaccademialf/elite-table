import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const CustomCalendar = ({ globalDates, setGlobalDates }) => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <div className="card-bg p-6">
      <div className="flex justify-between items-center mb-6 px-2">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
          ГРУДЕНЬ 2025
        </span>
        <div className="flex gap-2">
          <ChevronLeft size={16} className="cursor-pointer text-gray-500" />
          <ChevronRight size={16} className="cursor-pointer text-gray-500" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-3">
        {days.map((day) => {
          const isSel =
            globalDates.start === day ||
            globalDates.end === day ||
            (globalDates.start &&
              globalDates.end &&
              day > globalDates.start &&
              day < globalDates.end);
          return (
            <button
              key={day}
              onClick={() => {
                let next = { ...globalDates };
                if (!globalDates.start || globalDates.end) next = { start: day, end: null };
                else {
                  if (day < globalDates.start) next = { start: day, end: null };
                  else next.end = day;
                }
                setGlobalDates(next);
              }}
              className={`h-10 w-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                isSel ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};
