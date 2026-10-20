import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix="nabiz-test-"))
os.environ.update(
    DATABASE_URL=f"sqlite:///{(_tmp / 'test.db').as_posix()}",
    SENTIMENT_BACKEND="lexicon",
    ENABLE_SCHEDULER="false",
    ANTHROPIC_API_KEY="",
)
