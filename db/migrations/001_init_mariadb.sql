-- Elite Table initial normalized schema for MariaDB 10.6+
-- UTF8 and strict mode are expected on the server.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (code, name)
VALUES
  ('customer', 'Customer'),
  ('manager', 'Manager')
ON DUPLICATE KEY UPDATE name = VALUES(name);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  firebase_uid VARCHAR(128) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(32) NOT NULL DEFAULT '',
  role_id TINYINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_public_id (public_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_firebase_uid (firebase_uid),
  KEY idx_users_role_id (role_id),
  CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  parent_id BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_public_id (public_id),
  UNIQUE KEY uq_categories_name (name),
  KEY idx_categories_parent_id (parent_id),
  CONSTRAINT fk_categories_parent_id FOREIGN KEY (parent_id) REFERENCES categories (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  sku VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id BIGINT UNSIGNED DEFAULT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  compensation_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity_total INT UNSIGNED NOT NULL DEFAULT 0,
  image_url TEXT,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_public_id (public_id),
  UNIQUE KEY uq_products_sku (sku),
  KEY idx_products_category_id (category_id),
  CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS extra_services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_type ENUM('fixed', 'per_day') NOT NULL DEFAULT 'fixed',
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_extra_services_public_id (public_id),
  UNIQUE KEY uq_extra_services_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  assigned_manager_id BIGINT UNSIGNED DEFAULT NULL,
  status ENUM('pending', 'in_progress', 'confirmed', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
  payment_method ENUM('manager_confirmation', 'liqpay') NOT NULL DEFAULT 'manager_confirmation',
  payment_status ENUM('awaiting_manager', 'pending', 'processing', 'paid', 'failed') NOT NULL DEFAULT 'awaiting_manager',
  liqpay_status VARCHAR(64) NOT NULL DEFAULT '',
  liqpay_transaction_id VARCHAR(128) NOT NULL DEFAULT '',
  payment_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_currency CHAR(3) NOT NULL DEFAULT 'UAH',
  event_start_date DATE NOT NULL,
  event_end_date DATE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(32) NOT NULL,
  delivery_address TEXT NOT NULL,
  notes TEXT,
  manager_notes TEXT,
  warehouse_status ENUM('pending', 'packing', 'done') NOT NULL DEFAULT 'pending',
  warehouse_notes TEXT,
  rental_days SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  items_subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  services_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_public_id (public_id),
  KEY idx_orders_user_id (user_id),
  KEY idx_orders_status_created_at (status, created_at),
  KEY idx_orders_payment_status (payment_status),
  CONSTRAINT fk_orders_user_id FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_orders_assigned_manager_id FOREIGN KEY (assigned_manager_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  sku_snapshot VARCHAR(64) NOT NULL,
  name_snapshot VARCHAR(255) NOT NULL,
  unit_price_snapshot DECIMAL(10,2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  broken_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  line_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_items_order_id (order_id),
  KEY idx_order_items_product_id (product_id),
  CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product_id FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_extra_services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  extra_service_id BIGINT UNSIGNED NOT NULL,
  name_snapshot VARCHAR(255) NOT NULL,
  unit_price_snapshot DECIMAL(10,2) NOT NULL,
  billing_type_snapshot ENUM('fixed', 'per_day') NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  line_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_extra_services_order_id (order_id),
  KEY idx_order_extra_services_service_id (extra_service_id),
  CONSTRAINT fk_order_extra_services_order_id FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_order_extra_services_service_id FOREIGN KEY (extra_service_id) REFERENCES extra_services (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS availability_daily (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  date_value DATE NOT NULL,
  booked_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_availability_daily_product_date (product_id, date_value),
  CONSTRAINT fk_availability_daily_product_id FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings_payment (
  id TINYINT UNSIGNED NOT NULL,
  liqpay_public_key VARCHAR(255) NOT NULL DEFAULT '',
  liqpay_private_key VARCHAR(255) NOT NULL DEFAULT '',
  liqpay_sandbox TINYINT(1) NOT NULL DEFAULT 1,
  app_base_url VARCHAR(512) NOT NULL DEFAULT '',
  updated_by VARCHAR(255) NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
