FROM oven/bun:1.3

# Git is required by husky. Build tools cover native modules.
# lcov/genhtml turns bun's lcov.info into the HTML coverage report for P1A.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        ca-certificates \
        build-essential \
        python3 \
        lcov \
    && rm -rf /var/lib/apt/lists/*

RUN bun --version
