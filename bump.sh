#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	npm publish --tag ${3-latest}
else
	npm run lint && npm run build
	if [[ $? -eq 0 ]]
	then
		sed -i '' -E "s/\"version\": \".+\"/\"version\": \"$1\"/" package.json
		sed -i '' -E "s/version = '.+'/version = '$1'/" src/main.ts
		git add -A
		git commit -m "chore: bump version to $1"
		git push
		git tag $1
		git push origin $1
	fi
fi
