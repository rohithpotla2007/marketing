-- =============================================================================
-- StockFlow WMS - Complete Relational Database Schema Reference
-- Compatible with PostgreSQL and SQLite
-- =============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'warehouse' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    icon_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
    image_url VARCHAR(500),
    quantity INTEGER DEFAULT 0 NOT NULL CHECK (quantity >= 0),
    reserved_quantity INTEGER DEFAULT 0 NOT NULL CHECK (reserved_quantity >= 0),
    low_stock_threshold INTEGER DEFAULT 10 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING' NOT NULL, -- PENDING, ACCEPTED, SHIPPED, CANCELLED
    total_items INTEGER DEFAULT 0 NOT NULL,
    total_quantity INTEGER DEFAULT 0 NOT NULL,
    notes VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- 5. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
    quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
    quantity_fulfilled INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 6. Restock Transactions Table
CREATE TABLE IF NOT EXISTS restock_transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
    quantity_added INTEGER NOT NULL CHECK (quantity_added > 0),
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_restock_product ON restock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_restock_date ON restock_transactions(created_at);

-- 7. Inventory Transactions Audit Table
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- RESTOCK, ORDER_RESERVED, ORDER_FULFILLED, REPLACEMENT_ISSUED, ORDER_CANCELLED
    quantity_change INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reference_id VARCHAR(100),
    reference_type VARCHAR(50),
    user_id INTEGER,
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inv_tx_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_type ON inventory_transactions(transaction_type);

-- 8. Order Verifications Table
CREATE TABLE IF NOT EXISTS order_verifications (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
    expected_quantity INTEGER NOT NULL CHECK (expected_quantity >= 0),
    good_quantity INTEGER DEFAULT 0 NOT NULL CHECK (good_quantity >= 0),
    damaged_quantity INTEGER DEFAULT 0 NOT NULL CHECK (damaged_quantity >= 0),
    missing_quantity INTEGER DEFAULT 0 NOT NULL CHECK (missing_quantity >= 0),
    is_replaced BOOLEAN DEFAULT FALSE NOT NULL,
    verified_by_user_id INTEGER REFERENCES users(id),
    notes VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_verif_order ON order_verifications(order_id);
CREATE INDEX IF NOT EXISTS idx_verif_product ON order_verifications(product_id);

-- 9. Damaged & Missing Records Table
CREATE TABLE IF NOT EXISTS damage_missing_records (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
    damaged_quantity INTEGER DEFAULT 0 NOT NULL CHECK (damaged_quantity >= 0),
    missing_quantity INTEGER DEFAULT 0 NOT NULL CHECK (missing_quantity >= 0),
    total_affected INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(30) DEFAULT 'REPORTED' NOT NULL, -- REPORTED, REPLACED, RESOLVED
    reported_by_user_id INTEGER REFERENCES users(id),
    notes VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dm_order ON damage_missing_records(order_id);
CREATE INDEX IF NOT EXISTS idx_dm_status ON damage_missing_records(status);

-- 10. Replacement Transactions Table
CREATE TABLE IF NOT EXISTS replacement_transactions (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
    quantity_replaced INTEGER NOT NULL CHECK (quantity_replaced > 0),
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rep_order ON replacement_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_rep_product ON replacement_transactions(product_id);

-- 11. Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE RESTRICT UNIQUE NOT NULL,
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    shipped_by_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
    shipped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes VARCHAR(500)
);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    user_id INTEGER,
    username VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    details VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
