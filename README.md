# LaFamiglia Rentco

Орендний застосунок для керування товарами, кошиком, замовленнями, складом та онлайн-оплатою через `LiqPay`.

## Запуск локально

```bash
npm install
npm run dev
```

Для продакшн-збірки:

```bash
npm run build
```

## Онлайн-оплата через LiqPay

Інтеграція реалізована за безпечним сценарієм:

- клієнт оформлює замовлення у `Checkout`
- обирає **`Оплатити зараз через LiqPay`**
- серверний endpoint створює підписаний платіж
- `LiqPay` callback оновлює статус оплати в `Firestore`

### Потрібні змінні середовища

Скопіюй `.env.example` і задай значення:

- `APP_BASE_URL`
- `LIQPAY_PUBLIC_KEY`
- `LIQPAY_PRIVATE_KEY`
- `LIQPAY_SANDBOX`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

> Для локального тестування серверних маршрутів `api/` зручно запускати проєкт через `vercel dev`.

## Ключові файли інтеграції

- `src/views/CheckoutView.jsx` — вибір способу оплати
- `src/services/liqpay.js` — запуск checkout redirect
- `api/liqpay/create-payment.js` — безпечне створення платежу
- `api/liqpay/callback.js` — оновлення статусу оплати після callback від `LiqPay`

## Перехід на власну MariaDB

Додано механізм поетапного переходу з Firebase на MariaDB через `DATA_PROVIDER`.

- `DATA_PROVIDER=firebase` — поточний режим
- `DATA_PROVIDER=mariadb` — режим власної БД

Детальна інструкція: `docs/mariadb-transition.md`.

SQL схема (3НФ) для порожньої БД: `db/migrations/001_init_mariadb.sql`.

