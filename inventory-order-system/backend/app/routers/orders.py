from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, schemas, database

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)

@router.get("/", response_model=List[schemas.OrderOut])
def read_orders(
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    return crud.get_orders(db, customer_id=customer_id, status=status)

@router.get("/{order_id}", response_model=schemas.OrderOut)
def read_order(order_id: int, db: Session = Depends(database.get_db)):
    db_order = crud.get_order(db, order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    return db_order

@router.post("/", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(order: schemas.OrderCreate, db: Session = Depends(database.get_db)):
    try:
        return crud.create_order(db, order_in=order)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(
    order_id: int, 
    status_update: schemas.OrderStatusUpdate, 
    db: Session = Depends(database.get_db)
):
    try:
        db_order = crud.update_order_status(db, order_id=order_id, status_update=status_update)
        if not db_order:
            raise HTTPException(status_code=404, detail="Order not found")
        return db_order
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{order_id}", response_model=schemas.OrderOut)
def delete_order(order_id: int, db: Session = Depends(database.get_db)):
    db_order = crud.delete_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    return db_order
