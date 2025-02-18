#!/bin/bash
set -e

# Generate TypeScript code from protobuf definitions.
# Uncomment the following lines if you also need Go code generation.
# buf generate --template buf.gen.gogo.yaml
# buf generate --template buf.gen.pulsar.yaml

buf generate --template buf.gen.ts.yaml

# If Buf outputs files into nested directories based on your go_package settings,
# adjust these copy commands as needed. They move the generated files to the proper locations.
if [ -d "github.com/noble-assets/forwarding/v2" ]; then
  cp -r github.com/noble-assets/forwarding/v2/* ./
fi

if [ -d "api/noble/forwarding" ]; then
  cp -r api/noble/forwarding/* api/
fi

# Cleanup temporary directories created by Buf.
rm -rf github.com api/noble noble
