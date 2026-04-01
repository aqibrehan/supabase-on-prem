import uuid

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_current_user, get_product_service
from app.schemas.product import (
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
)
from app.services.product import ProductService

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, max_length=200, description="Search name/description"),
    min_price: float | None = Query(None, ge=0, description="Minimum price filter"),
    max_price: float | None = Query(None, ge=0, description="Maximum price filter"),
    service: ProductService = Depends(get_product_service),
    _user: dict = Depends(get_current_user),
):
    return await service.list_products(
        page=page,
        page_size=page_size,
        search=search,
        min_price=min_price,
        max_price=max_price,
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: uuid.UUID,
    service: ProductService = Depends(get_product_service),
    _user: dict = Depends(get_current_user),
):
    return await service.get_product(product_id)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    service: ProductService = Depends(get_product_service),
    _user: dict = Depends(get_current_user),
):
    return await service.create_product(data)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    service: ProductService = Depends(get_product_service),
    _user: dict = Depends(get_current_user),
):
    return await service.update_product(product_id, data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    service: ProductService = Depends(get_product_service),
    _user: dict = Depends(get_current_user),
):
    await service.delete_product(product_id)
