#!/bin/sh
# معاينةٌ محلّية: http://localhost:8790/index.html?demo=1
cd "$(dirname "$0")/.." && python3 -m http.server 8790
