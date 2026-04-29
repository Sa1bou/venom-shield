#!/bin/bash
# Venom Shield + Magika — File Type Safety Check
# Fires before Read operations to detect disguised malicious files

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('file_path', ''))
except:
    print('')
" 2>/dev/null)

# Skip if no file path or file doesn't exist
if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Skip system/config files
case "$FILE_PATH" in
  /usr/*|/System/*|/Library/*)
    exit 0 ;;
esac

# Run magika
RESULT=$(magika --json "$FILE_PATH" 2>/dev/null)
if [ $? -ne 0 ]; then
  exit 0
fi

# Extract detected type
TYPE=$(echo "$RESULT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d[0].get('output', {}).get('ct_label', 'unknown'))
except:
    print('unknown')
" 2>/dev/null)

# Get file extension
EXT="${FILE_PATH##*.}"

# Dangerous types that should never appear as innocent files
DANGEROUS="pe32 elf shell shellcode msi apk dex bytecode"

for DTYPE in $DANGEROUS; do
  if echo "$TYPE" | grep -qi "$DTYPE"; then
    echo ""
    echo "[VENOM+MAGIKA] ⚠️  DANGEROUS FILE DETECTED"
    echo "  File : $FILE_PATH"
    echo "  Type : $TYPE (detected by Magika)"
    echo "  Ext  : .$EXT"
    echo "  Action: Read blocked. This file may be malicious."
    echo ""
    exit 1
  fi
done

echo "🛡️ [MAGIKA] $FILE_PATH → $TYPE ✓"
exit 0
