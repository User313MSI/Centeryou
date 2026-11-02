#!/bin/sh
# FlowPlan — ouvre l'app directement dans le navigateur (macOS/Linux).
cd "$(dirname "$0")"
open index.html 2>/dev/null || xdg-open index.html
