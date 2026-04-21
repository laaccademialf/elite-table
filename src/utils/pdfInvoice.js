import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const formatDate = (date) => {
  if (!date) return '—';
  if (typeof date === 'string') return date;
  if (date.day && date.month !== undefined && date.year) {
    const d = String(date.day).padStart(2, '0');
    const m = String(date.month + 1).padStart(2, '0');
    return `${d}.${m}.${date.year}`;
  }
  if (date.toDate) {
    return date.toDate().toLocaleDateString('uk-UA');
  }
  return String(date);
};

const calculateRentalDays = (eventDate, eventEndDate) => {
  if (!eventDate || !eventEndDate) return 1;

  const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('.');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    return new Date(year, month - 1, day);
  };

  const startDate = parseDate(eventDate);
  const endDate = parseDate(eventEndDate);

  if (!startDate || !endDate) return 1;

  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `${amount.toFixed(0)} грн`;
};

const getCustomerName = (order) => {
  if (!order) return 'Клієнт';
  if (order.customerName && order.customerName.trim()) return order.customerName.trim();
  if (order.customerEmail) return order.customerEmail.split('@')[0];
  if (order.customerPhone) return order.customerPhone;
  return 'Клієнт';
};

const buildInvoiceMarkup = (order, options = {}) => {
  const { compensationOnly = false } = options;
  const rentalDays = calculateRentalDays(order.eventDate, order.eventEndDate);
  const items = order.items || [];
  const extraServices = order.extraServices || [];
  const itemsSubtotal = Number(
    order.itemsSubtotal ||
      items.reduce((sum, item) => {
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        return sum + quantity * price * rentalDays;
      }, 0)
  );
  const servicesTotal = Number(
    order.servicesTotal ||
      extraServices.reduce((sum, service) => sum + Number(service.total ?? service.price ?? 0), 0)
  );
  const grandTotal = Number(order.totalPrice || itemsSubtotal + servicesTotal);
  const issueDate = order.createdAt?.toDate?.()
    ? order.createdAt.toDate().toLocaleDateString('uk-UA')
    : new Date().toLocaleDateString('uk-UA');

  // Compensation items (broken goods)
  const brokenItems = items.filter(item => Number(item.brokenQuantity || 0) > 0);
  const compensationTotal = brokenItems.reduce((sum, item) => {
    const broken = Number(item.brokenQuantity || 0);
    const compPrice = Number(item.compensationPrice || 0);
    return sum + broken * compPrice;
  }, 0);

  const compensationMarkup = brokenItems.length > 0 ? `
    <div style="background:#7f1d1d; color:#fff; font-weight:700; text-align:center; padding:8px 16px; font-size:16px; margin-top:10px;">Компенсація за бій / втрату</div>
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <thead>
        <tr style="background:#fee2e2; color:#7f1d1d;">
          <th style="border:1px solid #fca5a5; padding:8px; text-align:left;">Товар</th>
          <th style="border:1px solid #fca5a5; padding:8px; text-align:center; width:90px;">Кількість</th>
          <th style="border:1px solid #fca5a5; padding:8px; text-align:right; width:140px;">Вартість компенсації</th>
          <th style="border:1px solid #fca5a5; padding:8px; text-align:right; width:120px;">Сума, грн</th>
        </tr>
      </thead>
      <tbody>
        ${brokenItems.map(item => {
          const broken = Number(item.brokenQuantity || 0);
          const compPrice = Number(item.compensationPrice || 0);
          const total = broken * compPrice;
          return `
            <tr>
              <td style="border:1px solid #fca5a5; padding:8px;">${escapeHtml(item.productName || item.name || 'Товар')}</td>
              <td style="border:1px solid #fca5a5; padding:8px; text-align:center;">${broken}</td>
              <td style="border:1px solid #fca5a5; padding:8px; text-align:right;">${compPrice.toFixed(0)} грн/шт</td>
              <td style="border:1px solid #fca5a5; padding:8px; text-align:right; font-weight:700;">${total.toFixed(0)}</td>
            </tr>
          `;
        }).join('')}
        <tr>
          <td colspan="3" style="border:1px solid #fca5a5; padding:10px 12px; font-weight:700; background:#fff1f2;">ВСЬОГО КОМПЕНСАЦІЯ, грн</td>
          <td style="border:1px solid #fca5a5; padding:10px 12px; text-align:right; font-weight:700; background:#fff1f2; font-size:15px; color:#7f1d1d;">${compensationTotal.toFixed(0)}</td>
        </tr>
      </tbody>
    </table>
  ` : '';


  const rowsMarkup = items.length
    ? items
        .map((item) => {
          const quantity = Number(item.quantity || 0);
          const price = Number(item.price || 0);
          const total = quantity * price * rentalDays;
          return `
            <tr>
              <td style="border:1px solid #cbd5e1; padding:8px;">${escapeHtml(item.productName || item.name || 'Товар')}</td>
              <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">шт</td>
              <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${quantity}</td>
              <td style="border:1px solid #cbd5e1; padding:8px; text-align:right;">${price.toFixed(0)}</td>
              <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${rentalDays}</td>
              <td style="border:1px solid #cbd5e1; padding:8px; text-align:right; font-weight:700;">${total.toFixed(0)}</td>
            </tr>
          `;
        })
        .join('')
    : `
      <tr>
        <td colspan="6" style="border:1px solid #cbd5e1; padding:10px; text-align:center; color:#64748b;">Немає позицій</td>
      </tr>
    `;

  const extraServicesMarkup = extraServices.length
    ? `
      <div style="background:#112248; color:#fff; font-weight:700; text-align:center; padding:8px 16px; font-size:16px; margin-top:10px;">Додаткові послуги</div>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#e8eefb; color:#243b6b;">
            <th style="border:1px solid #cbd5e1; padding:8px; text-align:left;">Послуга</th>
            <th style="border:1px solid #cbd5e1; padding:8px; text-align:left;">Тип</th>
            <th style="border:1px solid #cbd5e1; padding:8px; text-align:right; width:120px;">Вартість, грн</th>
          </tr>
        </thead>
        <tbody>
          ${extraServices
            .map((service) => {
              const total = Number(service.total ?? service.price ?? 0);
              const label = service.billingType === 'per_day'
                ? `${Number(service.price || 0).toFixed(0)} грн × ${rentalDays} дн.`
                : 'Фіксована ціна';
              return `
                <tr>
                  <td style="border:1px solid #cbd5e1; padding:8px;">${escapeHtml(service.name || 'Послуга')}</td>
                  <td style="border:1px solid #cbd5e1; padding:8px;">${escapeHtml(label)}</td>
                  <td style="border:1px solid #cbd5e1; padding:8px; text-align:right; font-weight:700;">${total.toFixed(0)}</td>
                </tr>
              `;
            })
            .join('')}
          <tr>
            <td colspan="2" style="border:1px solid #cbd5e1; padding:10px 12px; font-weight:700; background:#f8fafc;">Всього за послуги, грн</td>
            <td style="border:1px solid #cbd5e1; padding:10px 12px; text-align:right; font-weight:700; background:#f8fafc;">${escapeHtml(formatCurrency(servicesTotal))}</td>
          </tr>
        </tbody>
      </table>
    `
    : '';

  return `
    <div style="width:1040px; background:#ffffff; color:#1e293b; font-family:Arial, Helvetica, sans-serif; border:1px solid #dbe2f0;">
      <div style="height:10px; background:#112248;"></div>
      <div style="padding:18px 24px 12px; border-bottom:1px solid #dbe2f0; text-align:center;">
        <img src="${window.location.origin}/RENTCO_logo.png" alt="LaFamiglia Rentco" style="height:58px; width:auto; object-fit:contain;" />
        <div style="margin-top:8px; font-size:12px; color:#475569;">Накладна до замовлення №${escapeHtml(String(order.id || '').slice(0, 8))}</div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <tbody>
          <tr>
            <td style="width:45%; border:1px solid #cbd5e1; padding:8px 12px;">Дата оренди</td>
            <td style="width:55%; border:1px solid #cbd5e1; padding:8px 12px; text-align:right;">${escapeHtml(formatDate(order.eventDate))} — ${escapeHtml(formatDate(order.eventEndDate || order.eventDate))}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1; padding:8px 12px;">Ім'я та номер телефону замовника</td>
            <td style="border:1px solid #cbd5e1; padding:8px 12px; text-align:right;">${escapeHtml(getCustomerName(order))} ${order.customerPhone ? `(${escapeHtml(order.customerPhone)})` : ''}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1; padding:8px 12px;">Email</td>
            <td style="border:1px solid #cbd5e1; padding:8px 12px; text-align:right;">${escapeHtml(order.customerEmail || '—')}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1; padding:8px 12px;">Адреса</td>
            <td style="border:1px solid #cbd5e1; padding:8px 12px; text-align:right;">${escapeHtml(order.address || '—')}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1; padding:8px 12px;">Дата створення</td>
            <td style="border:1px solid #cbd5e1; padding:8px 12px; text-align:right;">${escapeHtml(issueDate)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #cbd5e1; padding:8px 12px;">Коментар</td>
            <td style="border:1px solid #cbd5e1; padding:8px 12px; text-align:right;">${escapeHtml(order.notes || '—')}</td>
          </tr>
        </tbody>
      </table>

      <div style="background:#112248; color:#fff; font-weight:700; text-align:center; padding:8px 16px; font-size:16px; margin-top:10px;">Товари</div>

      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#e8eefb; color:#243b6b;">
            <th style="border:1px solid #cbd5e1; padding:8px; text-align:left;">Товари</th>
            <th style="border:1px solid #cbd5e1; padding:8px; text-align:center; width:70px;">Од.</th>
            <th style="border:1px solid #cbd5e1; padding:8px; text-align:center; width:90px;">Кількість</th>
            <th style="border:1px solid #cbd5e1; padding:8px; text-align:right; width:110px;">Ціна/день</th>
            <th style="border:1px solid #cbd5e1; padding:8px; text-align:center; width:60px;">Дні</th>
            <th style="border:1px solid #cbd5e1; padding:8px; text-align:right; width:120px;">Вартість, грн</th>
          </tr>
        </thead>
        <tbody>
          ${rowsMarkup}
          <tr>
            <td colspan="5" style="border:1px solid #cbd5e1; padding:10px 12px; font-weight:700; background:#f8fafc;">Товари, грн</td>
            <td style="border:1px solid #cbd5e1; padding:10px 12px; text-align:right; font-weight:700; background:#f8fafc;">${escapeHtml(formatCurrency(itemsSubtotal))}</td>
          </tr>
          ${servicesTotal > 0 ? `
            <tr>
              <td colspan="5" style="border:1px solid #cbd5e1; padding:10px 12px; font-weight:700; background:#f8fafc;">Додаткові послуги, грн</td>
              <td style="border:1px solid #cbd5e1; padding:10px 12px; text-align:right; font-weight:700; background:#f8fafc;">${escapeHtml(formatCurrency(servicesTotal))}</td>
            </tr>
          ` : ''}
          <tr>
            <td colspan="5" style="border:1px solid #cbd5e1; padding:10px 12px; font-weight:700; background:#eef2ff;">Всього, грн</td>
            <td style="border:1px solid #cbd5e1; padding:10px 12px; text-align:right; font-weight:700; background:#eef2ff;">${escapeHtml(formatCurrency(grandTotal))}</td>
          </tr>
        </tbody>
      </table>

      ${extraServicesMarkup}

      ${!compensationOnly ? compensationMarkup : ''}

      <div style="background:#112248; color:#fff; font-weight:700; text-align:center; padding:8px 16px; font-size:16px; margin-top:10px;">Деталі оплати</div>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <tbody>
          <tr>
            <td style="border:1px solid #cbd5e1; padding:12px; font-weight:700; background:#f8fafc;">ВСЬОГО ДО СПЛАТИ, грн</td>
            <td style="border:1px solid #cbd5e1; padding:12px; text-align:right; font-weight:700; font-size:18px; background:#f8fafc;">${escapeHtml(formatCurrency(grandTotal))}</td>
          </tr>
          ${compensationTotal > 0 && !compensationOnly ? `
          <tr>
            <td style="border:1px solid #fca5a5; padding:12px; font-weight:700; background:#fff1f2; color:#7f1d1d;">КОМПЕНСАЦІЯ ЗА БІЙ, грн</td>
            <td style="border:1px solid #fca5a5; padding:12px; text-align:right; font-weight:700; font-size:18px; background:#fff1f2; color:#7f1d1d;">${formatCurrency(compensationTotal)}</td>
          </tr>` : ''}
        </tbody>
      </table>

      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; padding:18px 24px 24px; font-size:12px; color:#334155;">
        <div>
          <div style="margin-bottom:28px; border-bottom:1px solid #94a3b8;"></div>
          <div style="text-align:center; font-weight:700;">Підпис орендодавця</div>
        </div>
        <div>
          <div style="margin-bottom:28px; border-bottom:1px solid #94a3b8;"></div>
          <div style="text-align:center; font-weight:700;">Підпис отримувача</div>
        </div>
        <div>
          <div style="margin-bottom:28px; border-bottom:1px solid #94a3b8;"></div>
          <div style="text-align:center; font-weight:700;">Підпис відправника</div>
        </div>
      </div>
    </div>
  `;
};

export const downloadOrderInvoicePdf = async (order) => {
  if (!order) return;

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.zIndex = '-1';
  host.innerHTML = buildInvoiceMarkup(order);
  document.body.appendChild(host);

  try {
    const target = host.firstElementChild;
    const images = Array.from(host.querySelectorAll('img'));

    await Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgHeight - heightLeft);
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight - margin * 2;
    }

    const shortId = String(order.id || 'order').slice(0, 8);
    pdf.save(`nakladna-${shortId}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
};

const renderHtmlToPdf = async (markup, filename) => {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.zIndex = '-1';
  host.innerHTML = markup;
  document.body.appendChild(host);
  try {
    const target = host.firstElementChild;
    const images = Array.from(host.querySelectorAll('img'));
    await Promise.all(images.map(img => new Promise(resolve => {
      if (img.complete) { resolve(); return; }
      img.onload = () => resolve();
      img.onerror = () => resolve();
    })));
    const canvas = await html2canvas(target, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');
    let heightLeft = imgHeight;
    let position = margin;
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight - margin * 2;
    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgHeight - heightLeft);
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight - margin * 2;
    }
    pdf.save(filename);
  } finally {
    document.body.removeChild(host);
  }
};

const buildCompensationMarkup = (order) => {
  const items = order.items || [];
  const brokenItems = items.filter(item => Number(item.brokenQuantity || 0) > 0);
  const compensationTotal = brokenItems.reduce((sum, item) => {
    return sum + Number(item.brokenQuantity || 0) * Number(item.compensationPrice || 0);
  }, 0);
  const issueDate = new Date().toLocaleDateString('uk-UA');
  const rowsMarkup = brokenItems.length ? brokenItems.map(item => {
    const broken = Number(item.brokenQuantity || 0);
    const compPrice = Number(item.compensationPrice || 0);
    const total = broken * compPrice;
    return `
      <tr>
        <td style="border:1px solid #fca5a5; padding:8px;">${escapeHtml(item.productName || item.name || 'Товар')}</td>
        <td style="border:1px solid #fca5a5; padding:8px; text-align:center;">${broken}</td>
        <td style="border:1px solid #fca5a5; padding:8px; text-align:right;">${compPrice.toFixed(0)} грн/шт</td>
        <td style="border:1px solid #fca5a5; padding:8px; text-align:right; font-weight:700;">${total.toFixed(0)}</td>
      </tr>`;
  }).join('') : `<tr><td colspan="4" style="border:1px solid #fca5a5; padding:10px; text-align:center; color:#64748b;">Немає позицій з боєм</td></tr>`;

  return `
    <div style="width:1040px; background:#ffffff; color:#1e293b; font-family:Arial, Helvetica, sans-serif; border:1px solid #fca5a5;">
      <div style="height:10px; background:#7f1d1d;"></div>
      <div style="padding:18px 24px 12px; border-bottom:1px solid #fca5a5; text-align:center;">
        <img src="${window.location.origin}/RENTCO_logo.png" alt="LaFamiglia Rentco" style="height:58px; width:auto; object-fit:contain;" />
        <div style="margin-top:8px; font-size:14px; font-weight:700; color:#7f1d1d;">Акт компенсації до замовлення №${escapeHtml(String(order.id || '').slice(0, 8))}</div>
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <tbody>
          <tr><td style="border:1px solid #fca5a5; padding:8px 12px;">Клієнт</td><td style="border:1px solid #fca5a5; padding:8px 12px; text-align:right;">${escapeHtml(getCustomerName(order))} ${order.customerPhone ? `(${escapeHtml(order.customerPhone)})` : ''}</td></tr>
          <tr><td style="border:1px solid #fca5a5; padding:8px 12px;">Дата оренди</td><td style="border:1px solid #fca5a5; padding:8px 12px; text-align:right;">${escapeHtml(formatDate(order.eventDate))} — ${escapeHtml(formatDate(order.eventEndDate || order.eventDate))}</td></tr>
          <tr><td style="border:1px solid #fca5a5; padding:8px 12px;">Дата складання акта</td><td style="border:1px solid #fca5a5; padding:8px 12px; text-align:right;">${issueDate}</td></tr>
        </tbody>
      </table>
      <div style="background:#7f1d1d; color:#fff; font-weight:700; text-align:center; padding:8px 16px; font-size:16px; margin-top:10px;">Позиції компенсації</div>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#fee2e2; color:#7f1d1d;">
            <th style="border:1px solid #fca5a5; padding:8px; text-align:left;">Товар</th>
            <th style="border:1px solid #fca5a5; padding:8px; text-align:center; width:90px;">Кількість (бій)</th>
            <th style="border:1px solid #fca5a5; padding:8px; text-align:right; width:160px;">Вартість компенсації</th>
            <th style="border:1px solid #fca5a5; padding:8px; text-align:right; width:120px;">Сума, грн</th>
          </tr>
        </thead>
        <tbody>
          ${rowsMarkup}
          <tr>
            <td colspan="3" style="border:1px solid #fca5a5; padding:12px; font-weight:700; background:#fff1f2; color:#7f1d1d;">ВСЬОГО ДО ОПЛАТИ (КОМПЕНСАЦІЯ), грн</td>
            <td style="border:1px solid #fca5a5; padding:12px; text-align:right; font-weight:700; font-size:18px; background:#fff1f2; color:#7f1d1d;">${compensationTotal.toFixed(0)}</td>
          </tr>
        </tbody>
      </table>
      <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:14px; padding:18px 24px 24px; font-size:12px; color:#334155;">
        <div>
          <div style="margin-bottom:28px; border-bottom:1px solid #94a3b8;"></div>
          <div style="text-align:center; font-weight:700;">Підпис орендодавця</div>
        </div>
        <div>
          <div style="margin-bottom:28px; border-bottom:1px solid #94a3b8;"></div>
          <div style="text-align:center; font-weight:700;">Підпис клієнта</div>
        </div>
      </div>
    </div>
  `;
};

export const downloadCompensationPdf = async (order) => {
  if (!order) return;
  const items = order.items || [];
  const brokenItems = items.filter(item => Number(item.brokenQuantity || 0) > 0);
  if (brokenItems.length === 0) {
    alert('У цьому замовленні немає позицій з боєм');
    return;
  }
  const shortId = String(order.id || 'order').slice(0, 8);
  await renderHtmlToPdf(buildCompensationMarkup(order), `kompensatsiya-${shortId}.pdf`);
};
