#!/bin/bash
# Exit code 2 feeds stderr back to Claude as a system message
echo "Seam: If you just made a design decision, chose a pattern, discovered a constraint, or learned something non-obvious that would help other agents — propose writing it to Seam. Ask the user: 'Want me to save this to Seam for the team?'" >&2
exit 2
