from pydantic import BaseModel, EmailStr, Field
from decimal import Decimal
from datetime import datetime
from typing import List, Optional

# --- Product Schemas ---
class ProductBase(BaseModel):
    sku: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    quantity_in_stock: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=10, ge=0)
    category: str = Field(..., max_length=50)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, ge=0)
    quantity_in_stock: Optional[int] = Field(None, ge=0)
    low_stock_threshold: Optional[int] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=50)

class ProductOut(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Customer Schemas ---
class CustomerBase(BaseModel):
    name: str = Field(..., max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None

class CustomerOut(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Order Item Schemas ---
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    product_name: Optional[str] = None
    product_sku: Optional[str] = None

    class Config:
        from_attributes = True


# --- Order Schemas ---
class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_items=1)

class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(PENDING|SHIPPED|DELIVERED|CANCELLED)$")

class OrderOut(BaseModel):
    id: int
    customer_id: int
    order_number: str
    status: str
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    customer: Optional[CustomerOut] = None
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


# --- Inventory Log Schemas ---
class InventoryLogBase(BaseModel):
    product_id: int
    change_amount: int
    reason: str = Field(..., pattern="^(RESTOCK|SALE|ADJUSTMENT)$")

class InventoryLogCreate(InventoryLogBase):
    pass

class InventoryLogOut(InventoryLogBase):
    id: int
    created_at: datetime
    product_name: Optional[str] = None
    product_sku: Optional[str] = None

    class Config:
        from_attributes = True


# --- Dashboard Schemas ---
class CategoryStock(BaseModel):
    category: str
    count: int

class RecentActivity(BaseModel):
    id: int
    type: str  # "ORDER" or "LOG"
    message: str
    timestamp: datetime

class DashboardStats(BaseModel):
    total_products: int
    low_stock_products: int
    total_customers: int
    total_orders: int
    total_revenue: Decimal
    category_distribution: List[CategoryStock]
    recent_activities: List[RecentActivity]
