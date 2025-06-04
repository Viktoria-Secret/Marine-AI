#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MarineAI - AI Service Main Application

This module serves as the entry point for the FastAPI application that powers
the AI service component of the MarineAI platform. It handles document processing,
embedding generation, vector search, and AI-powered question answering.
"""

import time
import logging
from contextlib import asynccontextmanager
from typing import Callable, List, Dict, Any, Optional

import uvicorn
from fastapi import FastAPI, Request, Response, status, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.security import APIKeyHeader
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

# Monitoring and metrics
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from prometheus_fastapi_instrumentator import Instrumentator, metrics

# Logging
from loguru import logger
import sys

# Config and environment
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

# Database and clients
import redis
import weaviate
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import routers
from app.routers import health, ingest, query, admin
from app.core.config import Settings, get_settings
from app.core.security import verify_api_key
from app.core.exceptions import AIServiceException
from app.core.logging import setup_logging
from app.core.db import init_db, get_db_session
from app.services.vector_store import get_vector_client
from app.services.openai_client import get_openai_client
from app.services.s3_client import get_s3_client
from app.utils.telemetry import setup_telemetry, flush_telemetry

# Load environment variables
load_dotenv()

# Initialize settings
settings = get_settings()

# Setup logging
setup_logging(settings.LOG_LEVEL)

# Metrics
REQUEST_COUNT = Counter(
    "http_requests_total", 
    "Total count of HTTP requests", 
    ["method", "endpoint", "status_code"]
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds", 
    "HTTP request latency in seconds",
    ["method", "endpoint"]
)

# API Key security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("🚀 Starting MarineAI AI Service")
    
    # Initialize database connection
    logger.info("Initializing database connection")
    init_db(settings)
    
    # Initialize vector store connection
    logger.info(f"Connecting to vector database at {settings.WEAVIATE_URL}")
    vector_client = get_vector_client()
    
    # Initialize OpenAI client
    logger.info("Initializing OpenAI client")
    openai_client = get_openai_client()
    
    # Initialize S3 client
    logger.info(f"Connecting to S3 storage at {settings.S3_ENDPOINT}")
    s3_client = get_s3_client()
    
    # Initialize Redis connection
    logger.info(f"Connecting to Redis at {settings.REDIS_URL}")
    redis_client = redis.from_url(settings.REDIS_URL)
    
    # Setup telemetry if enabled
    if settings.ENABLE_TELEMETRY:
        logger.info("Setting up telemetry")
        setup_telemetry()
    
    # Store clients in app state
    app.state.vector_client = vector_client
    app.state.openai_client = openai_client
    app.state.s3_client = s3_client
    app.state.redis_client = redis_client
    
    logger.info("✅ Startup complete")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down MarineAI AI Service")
    
    # Close vector store connection
    logger.info("Closing vector database connection")
    if hasattr(app.state, "vector_client") and app.state.vector_client:
        app.state.vector_client.close()
    
    # Close Redis connection
    logger.info("Closing Redis connection")
    if hasattr(app.state, "redis_client") and app.state.redis_client:
        app.state.redis_client.close()
    
    # Flush telemetry
    if settings.ENABLE_TELEMETRY:
        logger.info("Flushing telemetry data")
        flush_telemetry()
    
    logger.info("✅ Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="MarineAI - AI Service",
    description="AI-powered document processing and question answering for vessel manuals",
    version="1.0.0",
    docs_url=None,  # Disable default docs URL
    redoc_url=None,  # Disable default redoc URL
    openapi_url="/api/openapi.json" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan
)


# Custom middleware for request timing and logging
class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Get client IP, handling proxy forwarding
        client_ip = request.headers.get("X-Forwarded-For", request.client.host)
        client_ip = client_ip.split(",")[0] if client_ip else "unknown"
        
        # Log request
        logger.debug(f"Request: {request.method} {request.url.path} from {client_ip}")
        
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = f"{process_time:.4f}"
            
            # Update metrics
            endpoint = request.url.path
            REQUEST_COUNT.labels(
                method=request.method, 
                endpoint=endpoint, 
                status_code=response.status_code
            ).inc()
            REQUEST_LATENCY.labels(
                method=request.method, 
                endpoint=endpoint
            ).observe(process_time)
            
            # Log response
            logger.debug(
                f"Response: {request.method} {request.url.path} - "
                f"Status: {response.status_code} - "
                f"Time: {process_time:.4f}s"
            )
            
            return response
        except Exception as e:
            # Log exception
            process_time = time.time() - start_time
            logger.exception(
                f"Error during {request.method} {request.url.path} - "
                f"Time: {process_time:.4f}s - "
                f"Error: {str(e)}"
            )
            
            # Return appropriate error response
            if isinstance(e, AIServiceException):
                return JSONResponse(
                    status_code=e.status_code,
                    content={"detail": e.detail, "code": e.code}
                )
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error", "code": "internal_error"}
            )


# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.add_middleware(TimingMiddleware)

# Add TrustedHostMiddleware in production
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=settings.ALLOWED_HOSTS
    )

# Setup Prometheus instrumentation
instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_respect_env_var=True,
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/metrics", "/health", "/health/live", "/health/ready"],
    env_var_name="ENABLE_METRICS",
    inprogress_name="inprogress",
    inprogress_labels=True,
)
instrumentator.instrument(app).expose(app, include_in_schema=False, should_gzip=True)


# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Add security scheme
    openapi_schema["components"] = {
        "securitySchemes": {
            "ApiKeyAuth": {
                "type": "apiKey",
                "in": "header",
                "name": "X-API-Key"
            }
        }
    }
    
    # Apply security globally
    openapi_schema["security"] = [{"ApiKeyAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


# Custom documentation endpoints
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Custom Swagger UI endpoint with API key authentication"""
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
    )


# Metrics endpoint
@app.get("/metrics", include_in_schema=False)
async def metrics_endpoint():
    """Endpoint that serves Prometheus metrics"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# API Key validation dependency
async def get_api_key(api_key: str = Depends(api_key_header)):
    """Validate API key for protected endpoints"""
    if settings.ENVIRONMENT == "development" and not settings.API_KEY_REQUIRED:
        return True
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is missing",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    if not verify_api_key(api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    return True


# Exception handlers
@app.exception_handler(AIServiceException)
async def ai_service_exception_handler(request: Request, exc: AIServiceException):
    """Handle custom AIServiceException"""
    logger.error(f"AIServiceException: {exc.detail} (Code: {exc.code})")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": exc.code},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle standard HTTPException"""
    logger.error(f"HTTPException: {exc.detail} (Status: {exc.status_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc.detail), "code": "http_error"},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unhandled exceptions"""
    logger.exception(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "code": "internal_error"},
    )


# Register routers
app.include_router(health.router, tags=["Health"])
app.include_router(ingest.router, prefix="/api", tags=["Ingestion"], dependencies=[Depends(get_api_key)])
app.include_router(query.router, prefix="/api", tags=["Query"], dependencies=[Depends(get_api_key)])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"], dependencies=[Depends(get_api_key)])


# Root endpoint
@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint with basic service information"""
    return {
        "service": "MarineAI AI Service",
        "version": app.version,
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "documentation": "/docs",
        "health": "/health",
    }


# Run the application directly when script is executed
if __name__ == "__main__":
    # Determine port from environment or use default
    port = int(os.getenv("PORT", 8000))
    
    # Run with uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower(),
        workers=settings.WORKERS,
    )
