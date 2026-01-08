import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { parseDateObject, formatDateToString, isDateInRange } from '../utils/availabilityUtils';

/**
 * Отримує доступність товару на конкретну дату
 * @param {string} productId - ID товару
 * @param {Date|Object} date - Дата для перевірки
 * @param {number} totalQuantity - Загальна кількість товару
 * @returns {Promise<number>} - Кількість доступних одиниць товару
 */
export async function getProductAvailabilityForDate(productId, date, totalQuantity) {
  try {
    const parsedDate = parseDateObject(date);
    const dateString = formatDateToString(parsedDate);
    
    // Отримуємо всі підтверджені замовлення
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('status', 'in', ['confirmed', 'paid', 'processing'])
    );
    
    const snapshot = await getDocs(q);
    let bookedQuantity = 0;

    snapshot.forEach(doc => {
      const order = doc.data();
      const { eventDate, eventEndDate, items } = order;

      if (!eventDate || !eventEndDate || !items) return;

      // Перевіряємо чи дата попадає в діапазон замовлення
      const inRange = isDateInRange(parsedDate, eventDate, eventEndDate);
      
      if (inRange) {
        // Знаходимо товар у замовленні
        const orderItem = items.find(item => item.id === productId);
        if (orderItem) {
          bookedQuantity += orderItem.quantity || 0;
        }
      }
    });

    return Math.max(0, totalQuantity - bookedQuantity);
  } catch (error) {
    console.error('Error getting product availability:', error);
    return totalQuantity; // У разі помилки повертаємо всю кількість
  }
}

/**
 * Отримує доступність товару на діапазон дат
 * @param {string} productId - ID товару
 * @param {Date|Object} startDate - Початкова дата
 * @param {Date|Object} endDate - Кінцева дата
 * @param {number} totalQuantity - Загальна кількість товару
 * @returns {Promise<Object>} - Об'єкт з доступністю по датах
 */
export async function getProductAvailabilityForRange(productId, startDate, endDate, totalQuantity) {
  try {
    const parsedStartDate = parseDateObject(startDate);
    const parsedEndDate = parseDateObject(endDate);
    
    // Отримуємо всі підтверджені замовлення
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('status', 'in', ['confirmed', 'paid', 'processing'])
    );
    
    const snapshot = await getDocs(q);
    const availabilityMap = {};

    // Створюємо карту доступності для кожного дня в діапазоні
    const currentDate = new Date(parsedStartDate);
    while (currentDate <= parsedEndDate) {
      const dateString = formatDateToString(currentDate);
      availabilityMap[dateString] = totalQuantity;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Віднімаємо заброньовані товари
    snapshot.forEach(doc => {
      const order = doc.data();
      const { eventDate, eventEndDate, items } = order;

      if (!eventDate || !eventEndDate || !items) return;

      // Знаходимо товар у замовленні
      const orderItem = items.find(item => item.id === productId);
      if (!orderItem) return;

      const bookedQty = orderItem.quantity || 0;

      // Перебираємо кожен день у діапазоні
      Object.keys(availabilityMap).forEach(dateString => {
        const [day, month, year] = dateString.split('.').map(Number);
        const checkDate = { day, month: month - 1, year };
        
        if (isDateInRange(checkDate, eventDate, eventEndDate)) {
          availabilityMap[dateString] = Math.max(0, availabilityMap[dateString] - bookedQty);
        }
      });
    });

    return availabilityMap;
  } catch (error) {
    console.error('Error getting product availability for range:', error);
    return {};
  }
}

/**
 * Перевіряє чи доступний товар на вказаний діапазон дат
 * @param {string} productId - ID товару
 * @param {Date|Object} startDate - Початкова дата
 * @param {Date|Object} endDate - Кінцева дата
 * @param {number} requiredQuantity - Необхідна кількість
 * @param {number} totalQuantity - Загальна кількість товару
 * @returns {Promise<boolean>} - true якщо товар доступний
 */
export async function isProductAvailable(productId, startDate, endDate, requiredQuantity, totalQuantity) {
  try {
    const availability = await getProductAvailabilityForRange(
      productId,
      startDate,
      endDate,
      totalQuantity
    );

    // Перевіряємо чи достатньо товару на всі дні діапазону
    const allDatesAvailable = Object.values(availability).every(
      availableQty => availableQty >= requiredQuantity
    );

    return allDatesAvailable;
  } catch (error) {
    console.error('Error checking product availability:', error);
    return false;
  }
}

/**
 * Отримує мінімальну доступність товару на діапазон дат
 * @param {string} productId - ID товару
 * @param {Date|Object} startDate - Початкова дата
 * @param {Date|Object} endDate - Кінцева дата
 * @param {number} totalQuantity - Загальна кількість товару
 * @returns {Promise<number>} - Мінімальна доступна кількість в діапазоні
 */
export async function getMinAvailabilityForRange(productId, startDate, endDate, totalQuantity) {
  try {
    const availability = await getProductAvailabilityForRange(
      productId,
      startDate,
      endDate,
      totalQuantity
    );

    if (Object.keys(availability).length === 0) {
      return totalQuantity;
    }

    return Math.min(...Object.values(availability));
  } catch (error) {
    console.error('Error getting min availability:', error);
    return totalQuantity;
  }
}

/**
 * Отримує заброньовані дати для товару
 * @param {string} productId - ID товару
 * @returns {Promise<Array>} - Масив діапазонів дат з бронюваннями
 */
export async function getBookedDatesForProduct(productId) {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('status', 'in', ['confirmed', 'paid', 'processing'])
    );
    
    const snapshot = await getDocs(q);
    const bookings = [];

    snapshot.forEach(doc => {
      const order = doc.data();
      const { eventDate, eventEndDate, items, customerName } = order;

      if (!eventDate || !eventEndDate || !items) return;

      const orderItem = items.find(item => item.id === productId);
      if (orderItem) {
        bookings.push({
          orderId: doc.id,
          startDate: eventDate,
          endDate: eventEndDate,
          quantity: orderItem.quantity,
          customerName: customerName || 'Невідомо'
        });
      }
    });

    return bookings;
  } catch (error) {
    console.error('Error getting booked dates:', error);
    return [];
  }
}
