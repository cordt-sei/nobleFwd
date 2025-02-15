# Noble Forwarding Middleware

Provides a simple middleware / helper to support USDC CCTP flows through Noble without requiring users to manually interact with the Noble chain. General functions:

- Query for an existing Noble forwarding account for a given hex address.
- Automatically register a new forwarding account if one does not exist.
- Sign and broadcast the registration transaction using Cosmos SDK tooling.
- Cache known forwarding accounts to reduce on-chain queries.

## Project Structure

```
.
├── buf.gen.gogo.yaml         # Buf configuration for gogo code generation
├── buf.gen.pulsar.yaml       # Buf configuration for pulsar code generation
├── generate.sh               # Script to generate code from proto files
├── proto                     # Protobuf definitions
│   ├── account.proto
│   ├── events.proto
│   ├── genesis.proto
│   ├── packet.proto
│   ├── query.proto
│   └── tx.proto
└── scripts                   # Application scripts
    ├── nobleForwarding.js   # The NobleForwarding library implementation
    └── server.js            # Example Express server integration
```

## Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd noble-forwarding
```

### 2. Install Dependencies

Ensure you have [Node.js](https://nodejs.org/) installed, then run:

```bash
yarn install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following variables (adjust the values as needed):

```env
PORT=3001
NOBLE_GRPC_ADDRESS=noble-grpc.example.com:443
NOBLE_RPC_URL=https://rpc.noble-chain.com
NOBLE_CHAIN_ID=noble-chain
NOBLE_SIGNER_MNEMONIC="your mnemonic here"
NOBLE_SIGNER_PREFIX=noble
```

### 4. Setup Protobuf Files

- Place your `.proto` files under the `proto` directory.
- The `buf.gen.gogo.yaml` and `buf.gen.pulsar.yaml` files provide configuration for code generation.  
- Run the code generation script:

```bash
yarn generate
```

This will use `generate.sh` to process your protobuf files. Adjust the generation script as needed to integrate with your desired code generators (e.g., gogo, pulsar).

### 5. Integrate with Your Workflow

- **Server Integration:**  
  The `scripts/server.js` file contains an example Express server that uses the `NobleForwarding` library from `scripts/nobleForwarding.js`.  
  You can integrate this library into your existing application by importing and using the `NobleForwarding` class:
  
  ```js
  import { NobleForwarding } from './scripts/nobleForwarding.js';

  const nobleForwarding = new NobleForwarding({
    grpcAddress: process.env.NOBLE_GRPC_ADDRESS,
    protoPath: './proto/query.proto', // Adjust this to your main proto file if needed
    confirmationDelay: 5000
  });

  // Example usage:
  const result = await nobleForwarding.ensureForwardingAccount("0xABC123...");
  console.log(result);
  ```
  
- **CCTP Flow:**  
  In your CCTP flow, after processing the originating burn transaction on an EVM or Solana chain and obtaining the user’s hex address, call `ensureForwardingAccount()` to get or create a Noble forwarding account. Use the returned Noble address for subsequent CCTP burn transactions.

## Running the Server

To start the sample Express server, run:

```bash
npm start
```

You can then test the endpoint (e.g., via Postman or curl) by sending a POST request to `http://localhost:3001/process-forwarding` with a JSON payload like:

```json
{
  "hexAddress": "0xABC123..."
}
```
