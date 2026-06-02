from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func
from fastapi import HTTPException, status
from datetime import datetime, timedelta
import uuid
from decimal import Decimal

from . import models, schemas

# --- Product CRUD ---

def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def get_products(db: Session, search: str = None, category: str = None, low_stock: bool = False):
    query = db.query(models.Product)
    if search:
        query = query.filter(
            or_(
                models.Product.name.ilike(f"%{search}%"),
                models.Product.sku.ilike(f"%{search}%"),
                models.Product.description.ilike(f"%{search}%")
            )
        )
    if category:
        query = query.filter(models.Product.category == category)
    if low_stock:
        query = query.filter(models.Product.quantity_in_stock <= models.Product.low_stock_threshold)
    
    return query.order_by(models.Product.id.desc()).all()

def create_product(db: Session, product: schemas.ProductCreate):
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    # If the product is created with stock, log the initial inventory
    if db_product.quantity_in_stock > 0:
        log = models.InventoryLog(
            product_id=db_product.id,
            change_amount=db_product.quantity_in_stock,
            reason="RESTOCK"
        )
        db.add(log)
        db.commit()
        
    return db_product

def update_product(db: Session, product_id: int, product_update: schemas.ProductUpdate):
    db_product = get_product(db, product_id)
    if not db_product:
        return None
    
    update_data = product_update.model_dump(exclude_unset=True)
    
    # Check if stock is being adjusted
    if "quantity_in_stock" in update_data:
        old_stock = db_product.quantity_in_stock
        new_stock = update_data["quantity_in_stock"]
        diff = new_stock - old_stock
        
        if diff != 0:
            log = models.InventoryLog(
                product_id=db_product.id,
                change_amount=diff,
                reason="RESTOCK" if diff > 0 else "ADJUSTMENT"
            )
            db.add(log)
            
    for key, value in update_data.items():
        setattr(db_product, key, value)
        
    db.commit()
    db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if not db_product:
        return None
    db.delete(db_product)
    db.commit()
    return db_product


# --- Customer CRUD ---

def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def get_customer_by_email(db: Session, email: str):
    return db.query(models.Customer).filter(models.Customer.email == email).first()

def get_customers(db: Session, search: str = None):
    query = db.query(models.Customer)
    if search:
        query = query.filter(
            or_(
                models.Customer.name.ilike(f"%{search}%"),
                models.Customer.email.ilike(f"%{search}%")
            )
        )
    return query.order_by(models.Customer.id.desc()).all()

def create_customer(db: Session, customer: schemas.CustomerCreate):
    db_customer = models.Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def update_customer(db: Session, customer_id: int, customer_update: schemas.CustomerUpdate):
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        return None
    
    update_data = customer_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_customer, key, value)
        
    db.commit()
    db.refresh(db_customer)
    return db_customer

def delete_customer(db: Session, customer_id: int):
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        return None
    db.delete(db_customer)
    db.commit()
    return db_customer


# --- Order CRUD & Transaction Logic ---

def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, customer_id: int = None, status: str = None):
    query = db.query(models.Order)
    if customer_id:
        query = query.filter(models.Order.customer_id == customer_id)
    if status:
        query = query.filter(models.Order.status == status)
    return query.order_by(models.Order.id.desc()).all()

def create_order(db: Session, order_in: schemas.OrderCreate):
    # Fetch Customer to verify exists
    db_customer = get_customer(db, order_in.customer_id)
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    # Start transaction-like block (atomic check-then-act)
    # Pydantic schema validation protects format, now check logical constraints
    order_items_to_create = []
    total_amount = Decimal("0.00")
    
    # 1. First Pass: Validate stock availability and calculate price
    for item in order_in.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")
            
        if product.quantity_in_stock < item.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for '{product.name}'. Requested: {item.quantity}, In stock: {product.quantity_in_stock}"
            )
            
        item_total = product.price * item.quantity
        total_amount += item_total
        
        # Deduct stock
        product.quantity_in_stock -= item.quantity
        
        # Keep track of records to save
        order_items_to_create.append((product, item.quantity))
        
    # 2. Generate unique order number
    order_num = f"ORD-2026-{uuid.uuid4().hex[:6].upper()}"
    
    # 3. Create Order Record
    db_order = models.Order(
        customer_id=order_in.customer_id,
        order_number=order_num,
        status="PENDING",
        total_amount=total_amount
    )
    db.add(db_order)
    db.flush() # Generates db_order.id
    
    # 4. Save items & inventory logs
    for product, qty in order_items_to_create:
        db_item = models.OrderItem(
            order_id=db_order.id,
            product_id=product.id,
            quantity=qty,
            unit_price=product.price
        )
        db.add(db_item)
        
        # Log sale in inventory
        log = models.InventoryLog(
            product_id=product.id,
            change_amount=-qty,
            reason="SALE"
        )
        db.add(log)
        
    db.commit()
    db.refresh(db_order)
    return db_order

def update_order_status(db: Session, order_id: int, status_update: schemas.OrderStatusUpdate):
    db_order = get_order(db, order_id)
    if not db_order:
        return None
        
    old_status = db_order.status
    new_status = status_update.status
    
    if old_status == new_status:
        return db_order
        
    # Reconcile Stock on Status Change
    if new_status == "CANCELLED" and old_status != "CANCELLED":
        # Refund stock for each item in the order
        for item in db_order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
            if product:
                product.quantity_in_stock += item.quantity
                # Log the refund/reversal
                log = models.InventoryLog(
                    product_id=product.id,
                    change_amount=item.quantity,
                    reason="RESTOCK"
                )
                db.add(log)
                
    elif old_status == "CANCELLED" and new_status != "CANCELLED":
        # Order is being un-cancelled, deduct stock again! Check stock first.
        items_to_deduct = []
        for item in db_order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product '{item.product_id}' no longer exists")
            if product.quantity_in_stock < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot reinstate order. Product '{product.name}' has insufficient stock. Needed: {item.quantity}, In stock: {product.quantity_in_stock}"
                )
            items_to_deduct.append((product, item.quantity))
            
        # Perform deduction and log sale
        for product, qty in items_to_deduct:
            product.quantity_in_stock -= qty
            log = models.InventoryLog(
                product_id=product.id,
                change_amount=-qty,
                reason="SALE"
            )
            db.add(log)
            
    db_order.status = new_status
    db.commit()
    db.refresh(db_order)
    return db_order

def delete_order(db: Session, order_id: int):
    db_order = get_order(db, order_id)
    if not db_order:
        return None
        
    # Refund stock if the deleted order wasn't cancelled yet
    if db_order.status != "CANCELLED":
        for item in db_order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
            if product:
                product.quantity_in_stock += item.quantity
                log = models.InventoryLog(
                    product_id=product.id,
                    change_amount=item.quantity,
                    reason="RESTOCK"
                )
                db.add(log)
                
    db.delete(db_order)
    db.commit()
    return db_order


# --- Inventory Logs CRUD ---

def get_inventory_logs(db: Session):
    return db.query(models.InventoryLog).order_by(models.InventoryLog.id.desc()).all()

def add_restock(db: Session, product_id: int, quantity: int):
    product = db.query(models.Product).filter(models.Product.id == product_id).with_for_update().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    product.quantity_in_stock += quantity
    
    log = models.InventoryLog(
        product_id=product_id,
        change_amount=quantity,
        reason="RESTOCK"
    )
    db.add(log)
    db.commit()
    db.refresh(product)
    return product


# --- Dashboard Analytics ---

def get_dashboard_stats(db: Session) -> schemas.DashboardStats:
    total_products = db.query(models.Product).count()
    
    low_stock_products = db.query(models.Product).filter(
        models.Product.quantity_in_stock <= models.Product.low_stock_threshold
    ).count()
    
    total_customers = db.query(models.Customer).count()
    
    # Sum of active orders (exclude Cancelled)
    total_orders = db.query(models.Order).count()
    
    revenue_query = db.query(func.sum(models.Order.total_amount)).filter(
        models.Order.status != "CANCELLED"
    ).scalar()
    total_revenue = Decimal(str(revenue_query)) if revenue_query else Decimal("0.00")
    
    # Category Distribution
    distribution = db.query(
        models.Product.category,
        func.count(models.Product.id)
    ).group_by(models.Product.category).all()
    
    category_distribution = [
        schemas.CategoryStock(category=dist[0], count=dist[1])
        for dist in distribution
    ]
    
    # Recent Activities: Merge recent orders and recent inventory logs
    recent_activities = []
    
    # Recent orders
    recent_orders = db.query(models.Order).order_by(models.Order.created_at.desc()).limit(5).all()
    for o in recent_orders:
        cust_name = o.customer.name if o.customer else "Unknown Customer"
        recent_activities.append(
            schemas.RecentActivity(
                id=o.id,
                type="ORDER",
                message=f"Order {o.order_number} created for {cust_name} (Total: ${o.total_amount:,.2f}, Status: {o.status})",
                timestamp=o.created_at
            )
        )
        
    # Recent inventory logs
    recent_logs = db.query(models.InventoryLog).order_by(models.InventoryLog.created_at.desc()).limit(5).all()
    for l in recent_logs:
        prod_name = l.product.name if l.product else "Deleted Product"
        action = "restocked" if l.change_amount > 0 else "sold"
        amt = abs(l.change_amount)
        recent_activities.append(
            schemas.RecentActivity(
                id=l.id,
                type="LOG",
                message=f"Product '{prod_name}' {action} by {amt} units ({l.reason})",
                timestamp=l.created_at
            )
        )
        
    # Sort activities by timestamp descending
    recent_activities.sort(key=lambda x: x.timestamp, reverse=True)
    recent_activities = recent_activities[:7] # Limit to 7
    
    return schemas.DashboardStats(
        total_products=total_products,
        low_stock_products=low_stock_products,
        total_customers=total_customers,
        total_orders=total_orders,
        total_revenue=total_revenue,
        category_distribution=category_distribution,
        recent_activities=recent_activities
    )
