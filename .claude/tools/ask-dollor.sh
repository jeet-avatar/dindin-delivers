#!/bin/bash
# Dollor.ai Anti-Hallucination Query Tool
# Usage: .claude/tools/ask-dollor.sh "YOUR QUESTION"
#
# Routes through deterministic lookup first (zero hallucination),
# falls back to Ollama model for semantic/conceptual questions.
#
# Output prefixes:
#   [LOOKUP] = Deterministic answer from source data
#   [OLLAMA] = Model-generated (verify if critical)
#   [ERROR]  = Something went wrong

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ $# -eq 0 ]; then
    echo "Usage: ask-dollor.sh \"YOUR QUESTION\""
    echo "  Zero-hallucination lookup with Ollama fallback."
    exit 1
fi

python3 "$SCRIPT_DIR/dollor-lookup.py" "$@"
