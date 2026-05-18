# Перехід з Firebase на MariaDB

Цей проєкт отримав механізм поетапного перемикання бекенду через змінну `DATA_PROVIDER`:

- `firebase` (поточний режим за замовчуванням)
- `mariadb` (новий режим для власного сервера)

## 1. Що вже реалізовано

1. Провайдер даних: `api/_lib/dataProvider.js`.
2. Підключення до MariaDB: `api/_lib/mariadb.js`.
3. Нормалізована схема БД (3НФ): `db/migrations/001_init_mariadb.sql`.
4. Налаштування LiqPay (`/api/admin/payment-settings`) працюють через абстракцію і підтримують обидва провайдери.
5. LiqPay payment endpoints (`/api/liqpay/create-payment`, `/api/liqpay/callback`) читають налаштування через provider-шар.
6. LiqPay callback оновлює статус замовлення через абстракцію, яка підтримує Firebase/MariaDB.

## 2. Швидкий старт для MariaDB

1. Створи БД та користувача на вашому сервері MariaDB.
2. Виконай SQL-міграцію:

```bash
mysql -h <host> -u <user> -p <db_name> < db/migrations/001_init_mariadb.sql
```

3. Додай змінні у `.env`:

```env
DATA_PROVIDER=mariadb
MARIADB_HOST=...
MARIADB_PORT=3306
MARIADB_USER=...
MARIADB_PASSWORD=...
MARIADB_DATABASE=...
MARIADB_SSL=false
MARIADB_POOL_SIZE=10
```

4. Переконайся, що таблиця `users` містить менеджера з роллю `manager` і `firebase_uid`/`email`, які відповідають акаунту адміністратора.

## 3. Нормалізація (3НФ): ключові рішення

1. Довідники винесені окремо: `roles`, `categories`, `extra_services`.
2. `orders` не зберігає масиви: позиції винесені в `order_items` і `order_extra_services`.
3. Збережено snapshot-поля (`name_snapshot`, `unit_price_snapshot`), щоб історія замовлення не ламалась при зміні довідників.
4. Агрегована наявність по днях: `availability_daily` з унікальним ключем `(product_id, date_value)`.
5. Платіжні технічні поля в `orders` нормалізовані і типізовані (`payment_status`, `liqpay_transaction_id`, `paid_at`).

## 4. План повної міграції без даунтайму

1. Перенести CRUD для `products`, `categories`, `extra_services`, `orders` в API-шар (по одному модулю).
2. У фронтенді перейти з прямого Firebase SDK на HTTP API сервіси.
3. На перехідний період залишити `DATA_PROVIDER=firebase` на проді.
4. Прогнати інтеграційні тести на staging з `DATA_PROVIDER=mariadb`.
5. Перемкнути прод на `mariadb` після smoke-тестів.

## 5. Важливо

Зараз база у вас порожня, тому міграція даних не потрібна. Достатньо підняти схему, завести початкового менеджера і поетапно перевести функції на API-рівень.
