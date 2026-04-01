import logging
import math
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.repositories.product import ProductRepository
from app.schemas.product import (
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
)

logger = logging.getLogger(__name__)


class ProductService:
    def __init__(self, session: AsyncSession):
        self.repo = ProductRepository(session)

    async def list_products(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
    ) -> ProductListResponse:
        skip = (page - 1) * page_size
        items, total = await self.repo.get_filtered(
            skip=skip,
            limit=page_size,
            search=search,
            min_price=min_price,
            max_price=max_price,
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        logger.info("Listed %d products (page %d/%d)", len(items), page, total_pages)
        return ProductListResponse(
            items=[ProductResponse.model_validate(p) for p in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_product(self, product_id: uuid.UUID) -> ProductResponse:
        product = await self.repo.get_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found",
            )
        return ProductResponse.model_validate(product)

    async def create_product(self, data: ProductCreate) -> ProductResponse:
        product = Product(**data.model_dump())
        created = await self.repo.create(product)
        logger.info("Created product: %s", created.id)
        return ProductResponse.model_validate(created)

    async def update_product(
        self, product_id: uuid.UUID, data: ProductUpdate
    ) -> ProductResponse:
        product = await self.repo.get_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found",
            )
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update",
            )
        updated = await self.repo.update(product, update_data)
        logger.info("Updated product: %s", product_id)
        return ProductResponse.model_validate(updated)

    async def delete_product(self, product_id: uuid.UUID) -> None:
        product = await self.repo.get_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found",
            )
        await self.repo.delete(product)
        logger.info("Deleted product: %s", product_id)
