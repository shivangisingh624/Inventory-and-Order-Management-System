-- Create Tables

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    quantity_in_stock INTEGER NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS inventory_logs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    change_amount INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('RESTOCK', 'SALE', 'ADJUSTMENT')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at in products and orders
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Seed Mock Data

-- Seed Products
INSERT INTO products (sku, name, description, price, quantity_in_stock, low_stock_threshold, category) VALUES
('TECH-KEY-001', 'CyberGlow Mechanical Keyboard', 'Tactile blue switch RGB mechanical keyboard with anodized aluminum body.', 129.99, 45, 10, 'Electronics'),
('TECH-MOU-002', 'PrecisionFlow Ergonomic Mouse', 'Wireless ergonomic mouse with high precision 16K DPI optical sensor and side scroll.', 79.50, 60, 15, 'Electronics'),
('TECH-MON-003', 'UltraVision 27" 4K Monitor', 'IPS professional color-accurate monitor, 144Hz, HDR400, USB-C power delivery.', 349.99, 8, 5, 'Electronics'),
('TECH-AUD-004', 'AuraCancel Noise-Cancelling Headphones', 'Active noise cancelling wireless headphones with 40-hour battery and high-res audio.', 199.99, 12, 5, 'Audio'),
('TECH-DOK-005', 'NexusHub 10-in-1 USB-C Dock', 'Aluminum multiport adapter with dual HDMI, Ethernet, SD reader, and 100W PD.', 89.99, 3, 5, 'Electronics'), -- Note: Under low stock threshold (3 < 5)
('OFF-CHR-001', 'ErgoMax Task Chair', 'Breathable mesh back ergonomic office task chair with dynamic lumbar support.', 249.99, 15, 5, 'Furniture'),
('OFF-DSK-002', 'Lumina Standing Desk', 'Dual-motor electric height adjustable sit-to-stand desk with memory presets, 120x60cm.', 399.00, 5, 2, 'Furniture');

-- Seed Customers
INSERT INTO customers (name, email, phone, address) VALUES
('Alice Vance', 'alice.vance@innovate.io', '+1-555-0199', '104 Tech Parkway, Suite 300, Austin, TX 78701'),
('Bob Miller', 'bob.miller@designstudio.net', '+1-555-0142', '452 Pine St, San Francisco, CA 94104'),
('Charlie Davis', 'charlie.davis@logix.org', '+1-555-0188', '89 Industrial Ave, Chicago, IL 60611'),
('Diana Prince', 'diana.prince@themyscira.com', '+1-555-0107', '17 Gateway Blvd, New York, NY 10001');

-- Seed Orders (adjust stock appropriately, mock orders don't automatically deduct in DB here, but let's deduct them from initial seed stock and log it)
INSERT INTO orders (customer_id, order_number, status, total_amount, created_at) VALUES
(1, 'ORD-2026-0001', 'DELIVERED', 289.48, '2026-05-15 10:30:00'),
(2, 'ORD-2026-0002', 'SHIPPED', 549.98, '2026-05-28 14:15:00'),
(3, 'ORD-2026-0003', 'PENDING', 89.99, '2026-06-01 09:00:00');

-- Seed Order Items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 129.99), -- CyberGlow Keyboard
(1, 2, 2, 79.50),  -- 2x PrecisionFlow Mouse
(2, 3, 1, 349.99), -- UltraVision Monitor
(2, 4, 1, 199.99), -- AuraCancel Headphones
(3, 5, 1, 89.99);  -- NexusHub Dock

-- Seed Inventory Logs (Log the initial stocking + sales for orders)
INSERT INTO inventory_logs (product_id, change_amount, reason, created_at) VALUES
(1, 46, 'RESTOCK', '2026-05-01 08:00:00'),
(1, -1, 'SALE', '2026-05-15 10:30:00'),
(2, 62, 'RESTOCK', '2026-05-01 08:00:00'),
(2, -2, 'SALE', '2026-05-15 10:30:00'),
(3, 9, 'RESTOCK', '2026-05-01 08:00:00'),
(3, -1, 'SALE', '2026-05-28 14:15:00'),
(4, 13, 'RESTOCK', '2026-05-01 08:00:00'),
(4, -1, 'SALE', '2026-05-28 14:15:00'),
(5, 4, 'RESTOCK', '2026-05-01 08:00:00'),
(5, -1, 'SALE', '2026-06-01 09:00:00'),
(6, 15, 'RESTOCK', '2026-05-01 08:00:00'),
(7, 5, 'RESTOCK', '2026-05-01 08:00:00');
