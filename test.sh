#!/bin/bash

pr_details="$(cat <<EOF
[{"url":"https://laviola.dev"}]
EOF
)"

codeowners=$(
  grep -o '@[[:alnum:]_-]\+' .github/CODEOWNERS \
    | sed 's/@//' \
    | sort -u \
    | paste -sd, -
)
echo "Adding codeowners as reviewers: $codeowners"

echo "$pr_details" | jq -r '.[] | .number' | xargs -I {} echo "gh pr edit "{}" --add-reviewer $codeowners"
# Extract codeowners from the CODEOWNERS file
