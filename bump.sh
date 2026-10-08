#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	npm publish --tag "${3-latest}"
elif [[ $2 == 'gh' ]]
then
	gsed -n "/## $1/,/##/{/^## .*/d;/./,\$!d;p}" CHANGELOG.md > release-notes.md
	gh release create "$1" --notes-file release-notes.md -t "$1" --verify-tag --latest="${3-true}"
	rm release-notes.md
else
	gsed -i -E "s/\"version\": \".+\"/\"version\": \"$1\"/" package.json
	npm run lint && npm run build && npm test
	if [[ $? -eq 0 ]]
	then
		git add -A
		git commit -m "chore: bump version to $1"
		git push
		git tag "$1"
		git push origin "$1"
	fi
fi
