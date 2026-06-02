from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, schemas, database

router = APIRouter(
    prefix="/customers",
    tags=["Customers"]
)

@router.get("/", response_model=List[schemas.CustomerOut])
def read_customers(
    search: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    return crud.get_customers(db, search=search)

@router.get("/{customer_id}", response_model=schemas.CustomerOut)
def read_customer(customer_id: int, db: Session = Depends(database.get_db)):
    db_customer = crud.get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db_customer

@router.post("/", response_model=schemas.CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(database.get_db)):
    db_customer = crud.get_customer_by_email(db, email=customer.email)
    if db_customer:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_customer(db, customer=customer)

@router.put("/{customer_id}", response_model=schemas.CustomerOut)
def update_customer(customer_id: int, customer_update: schemas.CustomerUpdate, db: Session = Depends(database.get_db)):
    db_customer = crud.update_customer(db, customer_id=customer_id, customer_update=customer_update)
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db_customer

@router.delete("/{customer_id}", response_model=schemas.CustomerOut)
def delete_customer(customer_id: int, db: Session = Depends(database.get_db)):
    db_customer = crud.delete_customer(db, customer_id=customer_id)
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db_customer
