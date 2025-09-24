"""Test configuration and utilities for the backend."""

import os
import sys
from pathlib import Path

# Add the src directory to the Python path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

# Set test environment variables
os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["REFRESH_TOKEN_EXPIRE_DAYS"] = "7"

# Disable external services for testing
os.environ["REDIS_CACHE_HOST"] = "localhost"
os.environ["REDIS_CACHE_PORT"] = "6379"
os.environ["REDIS_QUEUE_HOST"] = "localhost"
os.environ["REDIS_QUEUE_PORT"] = "6379"
