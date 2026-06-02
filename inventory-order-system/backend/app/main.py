from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import products, customers, orders, inventory

# Automatically create SQLAlchemy tables
Base.metadata.create_all(bind=engine)

# Auto-seed default database records if empty (useful for local SQLite or new PG instances)
from .database import SessionLocal
from . import models
from decimal import Decimal

db = SessionLocal()
try:
    if db.query(models.Product).count() == 0:
        # Seed Products
        seed_products = [
            models.Product(sku='TECH-KEY-001', name='CyberGlow Mechanical Keyboard', description='Tactile blue switch RGB mechanical keyboard with anodized aluminum body.', price=Decimal('129.99'), quantity_in_stock=45, low_stock_threshold=10, category='Electronics'),
            models.Product(sku='TECH-MOU-002', name='PrecisionFlow Ergonomic Mouse', description='Wireless ergonomic mouse with high precision 16K DPI optical sensor and side scroll.', price=Decimal('79.50'), quantity_in_stock=60, low_stock_threshold=15, category='Electronics'),
            models.Product(sku='TECH-MON-003', name='UltraVision 27" 4K Monitor', description='IPS professional color-accurate monitor, 144Hz, HDR400, USB-C power delivery.', price=Decimal('349.99'), quantity_in_stock=8, low_stock_threshold=5, category='Electronics'),
            models.Product(sku='TECH-AUD-004', name='AuraCancel Noise-Cancelling Headphones', description='Active noise cancelling wireless headphones with 40-hour battery and high-res audio.', price=Decimal('199.99'), quantity_in_stock=12, low_stock_threshold=5, category='Audio'),
            models.Product(sku='TECH-DOK-005', name='NexusHub 10-in-1 USB-C Dock', description='Aluminum multiport adapter with dual HDMI, Ethernet, SD reader, and 100W PD.', price=Decimal('89.99'), quantity_in_stock=3, low_stock_threshold=5, category='Electronics'),
            models.Product(sku='OFF-CHR-001', name='ErgoMax Task Chair', description='Breathable mesh back ergonomic office task chair with dynamic lumbar support.', price=Decimal('249.99'), quantity_in_stock=15, low_stock_threshold=5, category='Furniture'),
            models.Product(sku='OFF-DSK-002', name='Lumina Standing Desk', description='Dual-motor electric height adjustable sit-to-stand desk with memory presets, 120x60cm.', price=Decimal('399.00'), quantity_in_stock=5, low_stock_threshold=2, category='Furniture')
        ]
        db.add_all(seed_products)
        db.commit()

        # Seed Customers
        seed_customers = [
            models.Customer(name='Alice Vance', email='alice.vance@innovate.io', phone='+1-555-0199', address='104 Tech Parkway, Suite 300, Austin, TX 78701'),
            models.Customer(name='Bob Miller', email='bob.miller@designstudio.net', phone='+1-555-0142', address='452 Pine St, San Francisco, CA 94104'),
            models.Customer(name='Charlie Davis', email='charlie.davis@logix.org', phone='+1-555-0188', address='89 Industrial Ave, Chicago, IL 60611'),
            models.Customer(name='Diana Prince', email='diana.prince@themyscira.com', phone='+1-555-0107', address='17 Gateway Blvd, New York, NY 10001')
        ]
        db.add_all(seed_customers)
        db.commit()
        
        # Seed Orders
        db_products = db.query(models.Product).all()
        db_customers = db.query(models.Customer).all()
        
        o1 = models.Order(customer_id=db_customers[0].id, order_number='ORD-2026-0001', status='DELIVERED', total_amount=Decimal('289.48'))
        o2 = models.Order(customer_id=db_customers[1].id, order_number='ORD-2026-0002', status='SHIPPED', total_amount=Decimal('549.98'))
        o3 = models.Order(customer_id=db_customers[2].id, order_number='ORD-2026-0003', status='PENDING', total_amount=Decimal('89.99'))
        db.add_all([o1, o2, o3])
        db.commit()
        
        # Seed Order Items
        oi1 = models.OrderItem(order_id=o1.id, product_id=db_products[0].id, quantity=1, unit_price=db_products[0].price)
        oi2 = models.OrderItem(order_id=o1.id, product_id=db_products[1].id, quantity=2, unit_price=db_products[1].price)
        oi3 = models.OrderItem(order_id=o2.id, product_id=db_products[2].id, quantity=1, unit_price=db_products[2].price)
        oi4 = models.OrderItem(order_id=o2.id, product_id=db_products[3].id, quantity=1, unit_price=db_products[3].price)
        oi5 = models.OrderItem(order_id=o3.id, product_id=db_products[4].id, quantity=1, unit_price=db_products[4].price)
        db.add_all([oi1, oi2, oi3, oi4, oi5])
        db.commit()

        # Seed Inventory Logs
        logs = [
            models.InventoryLog(product_id=db_products[0].id, change_amount=46, reason='RESTOCK'),
            models.InventoryLog(product_id=db_products[0].id, change_amount=-1, reason='SALE'),
            models.InventoryLog(product_id=db_products[1].id, change_amount=62, reason='RESTOCK'),
            models.InventoryLog(product_id=db_products[1].id, change_amount=-2, reason='SALE'),
            models.InventoryLog(product_id=db_products[2].id, change_amount=9, reason='RESTOCK'),
            models.InventoryLog(product_id=db_products[2].id, change_amount=-1, reason='SALE'),
            models.InventoryLog(product_id=db_products[3].id, change_amount=13, reason='RESTOCK'),
            models.InventoryLog(product_id=db_products[3].id, change_amount=-1, reason='SALE'),
            models.InventoryLog(product_id=db_products[4].id, change_amount=4, reason='RESTOCK'),
            models.InventoryLog(product_id=db_products[4].id, change_amount=-1, reason='SALE'),
            models.InventoryLog(product_id=db_products[5].id, change_amount=15, reason='RESTOCK'),
            models.InventoryLog(product_id=db_products[6].id, change_amount=5, reason='RESTOCK')
        ]
        db.add_all(logs)
        db.commit()
finally:
    db.close()

app = FastAPI(
    title="Inventory & Order Management API",
    description="Backend API for managing products, customers, orders, and tracking real-time stock levels.",
    version="1.0.0"
)

# Configure CORS to allow our React app to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, we can allow all or filter to localhost:5173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api/v1 prefix
app.include_router(products.router, prefix="/api/v1")
app.include_router(customers.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Inventory & Order Management API",
        "version": "1.0.0",
        "documentation": "/docs"
    }
