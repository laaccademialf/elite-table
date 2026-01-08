import * as XLSX from 'xlsx';

/**
 * Експортує товари в Excel файл
 * @param {Array} products - Масив товарів
 */
export const exportProductsToExcel = (products) => {
  // Формуємо дані для експорту
  const data = products.map(product => ({
    'Назва': product.name || '',
    'Опис': product.description || '',
    'Ціна': product.price || 0,
    'Кількість': product.quantity || 0,
    'Категорія': product.category || '',
    'Посилання на фото': product.image || ''
  }));

  // Створюємо worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Встановлюємо ширину колонок
  const columnWidths = [
    { wch: 30 }, // Назва
    { wch: 50 }, // Опис
    { wch: 10 }, // Ціна
    { wch: 10 }, // Кількість
    { wch: 20 }, // Категорія
    { wch: 50 }, // Посилання на фото
  ];
  worksheet['!cols'] = columnWidths;

  // Створюємо workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Товари');

  // Зберігаємо файл
  const fileName = `products_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Завантажує шаблон Excel для заповнення
 */
export const downloadExcelTemplate = () => {
  // Створюємо приклад даних для шаблону
  const templateData = [
    {
      'Назва': 'Приклад: Стіл банкетний',
      'Опис': 'Приклад: Великий стіл для банкетів розміром 180x80 см',
      'Ціна': 500,
      'Кількість': 10,
      'Категорія': 'tables',
      'Посилання на фото': 'https://example.com/photo.jpg'
    },
    {
      'Назва': '',
      'Опис': '',
      'Ціна': 0,
      'Кількість': 0,
      'Категорія': '',
      'Посилання на фото': ''
    }
  ];

  // Створюємо worksheet з шаблоном
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  // Встановлюємо ширину колонок
  const columnWidths = [
    { wch: 30 }, // Назва
    { wch: 50 }, // Опис
    { wch: 10 }, // Ціна
    { wch: 10 }, // Кількість
    { wch: 20 }, // Категорія
    { wch: 50 }, // Посилання на фото
  ];
  worksheet['!cols'] = columnWidths;

  // Створюємо workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Шаблон');

  // Додаємо аркуш з підказками для категорій
  const categoriesData = [
    { 'Код категорії': 'tables', 'Назва': 'Столи' },
    { 'Код категорії': 'chairs', 'Назва': 'Стільці' },
    { 'Код категорії': 'textiles', 'Назва': 'Текстиль' },
    { 'Код категорії': 'decor', 'Назва': 'Декор' },
    { 'Код категорії': 'lighting', 'Назва': 'Освітлення' },
    { 'Код категорії': 'dishes', 'Назва': 'Посуд' }
  ];
  const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
  categoriesSheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Категорії');

  // Зберігаємо файл
  XLSX.writeFile(workbook, 'products_template.xlsx');
};

/**
 * Імпортує товари з Excel файлу
 * @param {File} file - Файл Excel
 * @returns {Promise<Array>} - Масив товарів
 */
export const importProductsFromExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Читаємо перший аркуш
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Конвертуємо в JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Мапимо дані на структуру товару
        const products = jsonData
          .filter(row => row['Назва'] && row['Назва'].trim() !== '' && !row['Назва'].startsWith('Приклад:'))
          .map(row => ({
            name: String(row['Назва'] || '').trim(),
            description: String(row['Опис'] || '').trim(),
            price: parseFloat(row['Ціна']) || 0,
            quantity: parseInt(row['Кількість']) || 0,
            category: String(row['Категорія'] || '').trim(),
            image: String(row['Посилання на фото'] || '').trim()
          }));
        
        // Валідація
        const validProducts = products.filter(product => {
          if (!product.name) return false;
          if (product.price < 0) return false;
          if (product.quantity < 0) return false;
          return true;
        });
        
        if (validProducts.length === 0) {
          reject(new Error('Файл не містить валідних товарів. Переконайтесь, що заповнені обов\'язкові поля: Назва, Ціна, Кількість.'));
          return;
        }
        
        resolve(validProducts);
      } catch (error) {
        reject(new Error('Помилка читання файлу: ' + error.message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Помилка завантаження файлу'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};
