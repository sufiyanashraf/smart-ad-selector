git filter-branch -f --env-filter '
# Apni details yahan set karein
CORRECT_NAME="Sufiyan Ashraf"
CORRECT_EMAIL="sufiyanashraf7@gmail.com"

# Agar Author naam "Lovable" ya "gpt-engineer-app[bot]" hai, to change karo
if [ "$GIT_AUTHOR_NAME" = "Lovable" ] || [ "$GIT_AUTHOR_NAME" = "gpt-engineer-app[bot]" ]
then
    export GIT_AUTHOR_NAME="$CORRECT_NAME"
    export GIT_AUTHOR_EMAIL="$CORRECT_EMAIL"
fi

# Agar Committer naam "Lovable" ya "gpt-engineer-app[bot]" hai, to change karo
if [ "$GIT_COMMITTER_NAME" = "Lovable" ] || [ "$GIT_COMMITTER_NAME" = "gpt-engineer-app[bot]" ]
then
    export GIT_COMMITTER_NAME="$CORRECT_NAME"
    export GIT_COMMITTER_EMAIL="$CORRECT_EMAIL"
fi
' --tag-name-filter cat -- --branches --tags