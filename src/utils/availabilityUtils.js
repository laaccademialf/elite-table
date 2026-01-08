/**
 * Утиліти для роботи з доступністю товарів
 */

/**
 * Розраховує кількість днів між двома датами (включно)
 */
export const calculateDaysBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return 1;
  
  const start = parseDateObject(startDate);
  const end = parseDateObject(endDate);
  
  if (!start || !end) return 1;
  
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

/**
 * Парсить об'єкт дати або рядок у Date
 */
export const parseDateObject = (date) => {
  if (!date) return null;
  
  // Якщо це вже Date
  if (date instanceof Date) return date;
  
  // Якщо це об'єкт {day, month, year}
  if (date.day && date.month !== undefined && date.year) {
    return new Date(date.year, date.month, date.day);
  }
  
  // Якщо це рядок DD.MM.YYYY
  if (typeof date === 'string') {
    const parts = date.split('.');
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day);
    }
  }
  
  return null;
};

/**
 * Форматує дату у DD.MM.YYYY
 */
export const formatDateToString = (date) => {
  if (!date) return '';
  
  const d = parseDateObject(date);
  if (!d) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}.${month}.${year}`;
};

/**
 * Генерує масив дат для календаря (поточний місяць + наступні 2)
 */
export const generateCalendarDates = (monthsAhead = 3) => {
  const dates = [];
  const today = new Date();
  
  for (let m = 0; m < monthsAhead; m++) {
    const month = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      // Пропускаємо минулі дати
      if (date >= today.setHours(0, 0, 0, 0)) {
        dates.push({
          date: date,
          day: day,
          month: monthIndex,
          year: year,
          dateString: formatDateToString({ day, month: monthIndex, year })
        });
      }
    }
  }
  
  return dates;
};

/**
 * Перевіряє, чи дата знаходиться в межах діапазону
 */
export const isDateInRange = (date, startDate, endDate) => {
  const d = parseDateObject(date);
  const start = parseDateObject(startDate);
  const end = parseDateObject(endDate);
  
  if (!d || !start) return false;
  if (!end) return d.getTime() === start.getTime();
  
  return d >= start && d <= end;
};

/**
 * Групує дати по місяцях
 */
export const groupDatesByMonth = (dates) => {
  const grouped = {};
  
  dates.forEach(dateObj => {
    const key = `${dateObj.year}-${dateObj.month}`;
    if (!grouped[key]) {
      grouped[key] = {
        year: dateObj.year,
        month: dateObj.month,
        dates: []
      };
    }
    grouped[key].dates.push(dateObj);
  });
  
  return Object.values(grouped);
};

/**
 * Отримує назву місяця українською
 */
export const getMonthName = (monthIndex) => {
  const months = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
  ];
  return months[monthIndex] || '';
};
