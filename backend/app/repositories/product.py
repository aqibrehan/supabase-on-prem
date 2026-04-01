from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.repositories.base import BaseRepository


class ProductRepository(BaseRepository[Product]):
    def __init__(self, session: AsyncSession):
        super().__init__(Product, session)

    async def get_filtered(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
    ) -> tuple[list[Product], int]:
        filters = []

        if search:
            pattern = f"%{search}%"
            filters.append(
                or_(
                    Product.name.ilike(pattern),
                    Product.description.ilike(pattern),
                )
            )

        if min_price is not None:
            filters.append(Product.price >= min_price)

        if max_price is not None:
            filters.append(Product.price <= max_price)

        return await self.get_all(
            skip=skip,
            limit=limit,
            filters=filters,
            order_by=Product.created_at.desc(),
        )
