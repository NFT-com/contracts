CONTRACT="Seaport"; \
`### Compile the contract ###` \
yarn build; \
`### Calculate the path to the dbg file for the contract ###` \
DBG_PATH="artifacts/contracts/""${CONTRACT}"" .sol/""${CONTRACT}"".dbg.json"; \
`### Get the build-info file from the dbg json ###` \
BUILD_PATH=`jq -r '.buildInfo[17:]' "$DBG_PATH"`; \
`### Get the Yul from the build-info ison ###` \
jq -r '.output.contracts."contracts/'"${CONTRACT}"'.sol".'"${CONTRACT}"'‚irOptimized' \
  artifacts/build-info/"$BUILD_PATH" \
`### Write the Yul returned as stdout above to a new file`
| cat > "${CONTRACT}".yul