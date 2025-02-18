# Noble Forwarding Middleware

Middleware for handling USDC CCTP flows through Noble without requiring individual users to sign messages or interact with the intermediary chain directly.

## Overview

This middleware provides robust functionality to support USDC Cross-Chain Transfer Protocol (CCTP) flows through Noble:

- Query and automatically register Noble forwarding accounts for given hex addresses
- Sign and broadcast registration transactions using Cosmos SDK tooling
- High-performance caching with TTL and size limits
- Built-in rate limiting and circuit breakers
- Full metrics and monitoring support

## Prerequisites

- Node.js 18+
- npm or yarn
- Docker (for local development)
- Access to Noble chain RPC endpoints

## Quick Start

### Clone and Install

```bash
git clone https://github.com/cordt-sei/nobleFwd.git
cd noble-forwarding
npm install
```

### Configure Environment

Create a `.env` file:

```env
# Server Configuration
PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# Noble Chain Configuration
NOBLE_GRPC_ADDRESS=noble-grpc.example.com:443
NOBLE_RPC_URL=https://rpc.noble-chain.com
NOBLE_CHAIN_ID=noble-chain
NOBLE_SIGNER_MNEMONIC="your mnemonic here"
NOBLE_SIGNER_PREFIX=noble

# Performance Configuration
CACHE_TTL=3600
CACHE_MAX_ITEMS=10000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Generate Protocol Buffers

```bash
npm run generate
```

### Start Development Server

```bash
npm run dev
```

## API Reference

### Query Forwarding Account

`GET /v1/accounts/:hexAddress`

Returns Noble forwarding account for a given hex address.

### Register Forwarding Account

`POST /v1/accounts`

```json
{
  "hexAddress": "0xABC...",
  "channel": "channel-0",  // Optional, defaults to "channel-39"
  "fallback": ""          // Optional fallback address
}
```

### Health Check

`GET /health`

### Metrics

`GET /metrics`

## Error Handling

The API uses standard HTTP status codes with detailed error responses:

```json
{
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "Invalid hex address format",
    "details": {...}
  }
}
```

## Security Best Practices

### Mnemonic Security

- Use secure secret management
- Rotate mnemonics regularly

### Network Security

- Enable TLS for all connections
- Configure proper rate limits

## Development

```bash
# Run tests
yarn test         # Unit tests
yarn test:int

# Generate protos
npm run generate

# Start development server
npm run dev
```

## Project Structure

```shell
.
├── src/
│   ├── lib/           # Core library implementation
│   ├── proto/         # Protobuf definitions
│   ├── server/        # API Server
│   └── config/        # Configuration
├── scripts/           # Utility scripts
├── test/             # Test suite
└── docker/           # Docker configuration
```

## License

MIT License - see LICENSE.md

## Contributing

See CONTRIBUTING.md for guidelines.
