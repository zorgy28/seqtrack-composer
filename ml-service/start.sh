#!/bin/bash
# Start the SeqTrack ML service with MPS (Metal) GPU support
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0  # Allow full GPU memory on M3 Ultra
cd "$(dirname "$0")"
python -m uvicorn main:app --host 0.0.0.0 --port 8200 --reload
