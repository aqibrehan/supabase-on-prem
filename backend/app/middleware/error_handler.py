import logging
import time
import traceback

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        try:
            response = await call_next(request)
            elapsed = (time.perf_counter() - start) * 1000
            logger.debug(
                "%s %s -> %s (%.1fms)",
                request.method,
                request.url.path,
                response.status_code,
                elapsed,
            )
            return response
        except Exception as exc:
            elapsed = (time.perf_counter() - start) * 1000
            logger.error(
                "Unhandled exception on %s %s (%.1fms): %s\n%s",
                request.method,
                request.url.path,
                elapsed,
                str(exc),
                traceback.format_exc(),
            )
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": str(exc)},
            )
