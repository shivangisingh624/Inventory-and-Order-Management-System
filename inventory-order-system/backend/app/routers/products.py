from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field

from .. import crud, schemas, database

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)

class RestockRequest(BaseModel):
    quantity: int = Field(..., gt=0)

@router.get("/", response_model=List[schemas.ProductOut])
def read_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock: Optional[bool] = False,
    db: Session = Depends(database.get_db)
):
    return crud.get_products(db, search=search, category=category, low_stock=low_stock)

@router.get("/{product_id}", response_model=schemas.ProductOut)
def read_product(product_id: int, db: Session = Depends(database.get_db)):
    db_product = crud.get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    return db_product

@router.post("/", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(database.get_db)):
    db_product = crud.get_product_by_sku(db, sku=product.sku)
    if db_product:
        raise HTTPException(status_code=400, detail="SKU already registered")
    return crud.create_product(db, product=product)

@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, product_update: schemas.ProductUpdate, db: Session = Depends(database.get_db)):
    db_product = crud.update_product(db, product_id=product_id, product_update=product_update)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    return db_product

@router.post("/{product_id}/restock", response_model=schemas.ProductOut)
def restock_product(product_id: int, request: RestockRequest, db: Session = Depends(database.get_db)):
    try:
        return crud.add_restock(db, product_id=product_id, quantity=request.quantity)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{product_id}", response_model=schemas.ProductOut)
def delete_product(product_id: int, db: Session = Depends(database.get_db)):
    db_product = crud.delete_product(db, product_id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    return db_product
