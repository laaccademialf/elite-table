import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthName, generateCalendarDates, groupDatesByMonth } from '../utils/availabilityUtils';

/**
 * Компонент календаря доступності товару
 * Показує доступність товару на різні дати
 */
export function AvailabilityCalendar({ 
  productId, 
  getAvailabilityForDate,
  onDateSelect,
  selectedStartDate,
  selectedEndDate,
  totalQuantity = 0
}) {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [availability, setAvailability] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Генеруємо дати для календаря (3 місяці вперед)
  const allDates = generateCalendarDates(3);
  const monthsData = groupDatesByMonth(allDates);

  // Завантажуємо доступність для поточного місяця
  useEffect(() => {
    const loadAvailability = async () => {
      if (!productId || !getAvailabilityForDate) return;
      
      setIsLoading(true);
      const currentMonth = monthsData[currentMonthIndex];
      if (!currentMonth) return;

      const availabilityMap = {};
      
      for (const dateObj of currentMonth.dates) {
        try {
          const available = await getAvailabilityForDate(productId, dateObj.date);
          availabilityMap[dateObj.dateString] = available;
        } catch (error) {
          console.error('Error loading availability for date:', dateObj.dateString, error);
          availabilityMap[dateObj.dateString] = totalQuantity;
        }
      }
      
      setAvailability(prev => ({ ...prev, ...availabilityMap }));
      setIsLoading(false);
    };

    loadAvailability();
  }, [productId, currentMonthIndex, getAvailabilityForDate, monthsData, totalQuantity]);

  const currentMonth = monthsData[currentMonthIndex];
  if (!currentMonth) return null;

  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      setCurrentMonthIndex(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex < monthsData.length - 1) {
      setCurrentMonthIndex(prev => prev + 1);
    }
  };

  const handleDateClick = (dateObj) => {
    if (onDateSelect) {
      onDateSelect(dateObj);
    }
  };

  // Визначаємо колір доступності
  const getAvailabilityColor = (available) => {
    if (available === 0) return 'bg-red-100 text-red-600';
    if (available <= totalQuantity * 0.3) return 'bg-orange-100 text-orange-600';
    return 'bg-green-100 text-green-600';
  };

  // Отримуємо перший день тижня місяця (для правильного вирівнювання)
  const firstDayOfMonth = new Date(currentMonth.year, currentMonth.month, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Понеділок = 0

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarIcon size={24} className="text-[#C5A059]" />
          <h3 className="text-xl font-bold text-gray-900">Календар доступності</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            disabled={currentMonthIndex === 0}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="px-4 py-2 bg-[#C5A059]/10 rounded-lg">
            <span className="font-bold text-gray-900">
              {getMonthName(currentMonth.month)} {currentMonth.year}
            </span>
          </div>
          
          <button
            onClick={handleNextMonth}
            disabled={currentMonthIndex === monthsData.length - 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100"></div>
          <span className="text-gray-600">Доступно</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-100"></div>
          <span className="text-gray-600">Мало</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-100"></div>
          <span className="text-gray-600">Немає</span>
        </div>
      </div>

      {/* Календарна сітка */}
      <div className="grid grid-cols-7 gap-2">
        {/* Заголовки днів тижня */}
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(day => (
          <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">
            {day}
          </div>
        ))}
        
        {/* Порожні клітинки до початку місяця */}
        {Array.from({ length: adjustedFirstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        
        {/* Дні місяця */}
        {currentMonth.dates.map(dateObj => {
          const available = availability[dateObj.dateString];
          const isSelected = selectedStartDate && selectedEndDate && 
            dateObj.date >= new Date(selectedStartDate.year, selectedStartDate.month, selectedStartDate.day) &&
            dateObj.date <= new Date(selectedEndDate.year, selectedEndDate.month, selectedEndDate.day);
          
          return (
            <button
              key={dateObj.dateString}
              onClick={() => handleDateClick(dateObj)}
              disabled={isLoading || available === 0}
              className={`
                relative aspect-square rounded-lg p-2 text-sm font-semibold transition-all
                ${available !== undefined ? getAvailabilityColor(available) : 'bg-gray-50 text-gray-400'}
                ${isSelected ? 'ring-2 ring-[#C5A059] ring-offset-2' : ''}
                ${available === 0 ? 'cursor-not-allowed opacity-50' : 'hover:scale-105 cursor-pointer'}
              `}
            >
              <div className="absolute top-1 left-0 right-0 text-center">
                {dateObj.day}
              </div>
              {available !== undefined && (
                <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-bold">
                  {available}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Завантаження доступності...
        </div>
      )}
    </div>
  );
}
