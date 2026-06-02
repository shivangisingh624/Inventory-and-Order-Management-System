from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas, database

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory Ledger & Stats"]
)

@router.get("/logs", response_model=List[schemas.InventoryLogOut])
def read_inventory_logs(db: Session = Depends(database.get_db)):
    return crud.get_inventory_logs(db)

@router.get("/stats", response_model=schemas.DashboardStats)
def read_dashboard_stats(db: Session = Depends(database.get_db)):
    try:
        return crud.get_dashboard_stats(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
