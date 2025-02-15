import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { setTimeout } from 'timers/promises';
import dotenv from 'dotenv';
import { SigningStargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

dotenv.config();

/**
 * NobleForwarding:
 * A mini-library to handle forwarding account queries/registrations on Noble.
 */
export class NobleForwarding {
  /**
   * @param {object} options
   * @param {string} options.grpcAddress - e.g. 'noble-grpc.example.com:443'
   * @param {string} options.protoPath - path to the Noble proto file
   * @param {number} [options.confirmationDelay=5000] - delay (ms) before re-querying after tx broadcast
   */
  constructor(options) {
    const { grpcAddress, protoPath, confirmationDelay = 5000 } = options;
    if (!grpcAddress || !protoPath) {
      throw new Error('grpcAddress and protoPath are required.');
    }
    this.grpcAddress = grpcAddress;
    this.protoPath = protoPath;
    this.confirmationDelay = confirmationDelay;

    // Create an in-memory cache for known forwarding accounts (hex -> noble address)
    this.cache = new Map();

    // Load the proto definition
    const packageDefinition = protoLoader.loadSync(this.protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    // Adjust the namespace to match your proto definition
    const nobleProto = grpc.loadPackageDefinition(packageDefinition).noble.forwarding.v1;
    this.nobleProto = nobleProto;

    // Create the gRPC client for querying
    this.queryClient = new nobleProto.Query(
      this.grpcAddress,
      grpc.credentials.createSsl()
    );
  }

  /**
   * queryForwardingAccount:
   * Checks if a forwarding account exists on Noble for the given hex address.
   *
   * @param {object} params
   * @param {string} params.channel - typically "channel-39"
   * @param {string} params.recipient - hex address to query
   * @param {string} [params.fallback=""] - optional fallback string
   * @returns {Promise<Object|null>} - returns { address, exists } if found, otherwise null
   */
  async queryForwardingAccount({ channel, recipient, fallback = '' }) {
    return new Promise((resolve) => {
      this.queryClient.Address({ channel, recipient, fallback }, (err, response) => {
        if (err) {
          console.error(`Error querying Noble: ${err.message}`);
          return resolve(null);
        }
        resolve(response);
      });
    });
  }

  /**
   * registerForwardingAccount:
   * Registers a forwarding account on Noble.
   *
   * @param {object} params
   * @param {string} params.channel
   * @param {string} params.recipient - hex address to register
   * @param {string} [params.fallback=""]
   * @returns {Promise<boolean>} - resolves true if registration was broadcast successfully.
   */
  async registerForwardingAccount({ channel, recipient, fallback = '' }) {
    // Build the registration payload as a Cosmos SDK–style tx.
    // Note: Adjust fee, gas, and message types as needed.
    const registrationPayload = {
      body: {
        messages: [
          {
            "@type": "/noble.forwarding.v1.MsgRegisterAccount",
            signer: "", // will be filled by the signing process
            recipient,
            channel,
            fallback,
          },
        ],
        memo: "",
      },
      auth_info: {
        fee: {
          amount: [
            {
              denom: "uusdc",
              amount: "20000",
            },
          ],
          gas: "200000",
        },
      },
    };

    // Sign and broadcast the tx
    const txResult = await this.broadcastRegistrationTx(registrationPayload);
    return txResult.success;
  }

  /**
   * broadcastRegistrationTx:
   * Signs and broadcasts the tx using the configured Noble signer.
   *
   * Uses @cosmjs/stargate for signing and broadcasting.
   *
   * @param {object} txPayload - The Cosmos SDK tx payload to sign & broadcast.
   * @returns {Promise<Object>} - e.g. { success: true, rawLog }
   */
  async broadcastRegistrationTx(txPayload) {
    const rpcUrl = process.env.NOBLE_RPC_URL;
    const chainId = process.env.NOBLE_CHAIN_ID;
    const signerMnemonic = process.env.NOBLE_SIGNER_MNEMONIC;
    const signerPrefix = process.env.NOBLE_SIGNER_PREFIX || 'noble';

    if (!rpcUrl || !chainId || !signerMnemonic) {
      throw new Error("Missing Noble signer configuration in env variables.");
    }

    // Create wallet from mnemonic
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(signerMnemonic, {
      prefix: signerPrefix,
    });
    const [firstAccount] = await wallet.getAccounts();

    // Create a SigningStargateClient instance
    const client = await SigningStargateClient.connectWithSigner(rpcUrl, wallet);

    // Extract messages, fee and memo from our txPayload.
    // Our txPayload.body should contain { messages, memo }.
    // Our txPayload.auth_info should contain { fee }.
    const messages = txPayload.body.messages;
    const memo = txPayload.body.memo || "";
    // The fee expected by signAndBroadcast is { amount: Array, gas: string }
    const fee = txPayload.auth_info.fee;

    console.log("Signing tx with account:", firstAccount.address);
    const result = await client.signAndBroadcast(firstAccount.address, messages, fee, memo);
    console.log("Broadcast result:", result);
    return { success: result.code === 0, rawLog: result.rawLog };
  }

  /**
   * ensureForwardingAccount:
   * Checks the internal cache, then on-chain via gRPC.
   * If no account exists, registers a new one, waits for confirmation, then updates the cache.
   *
   * @param {string} hexAddress - user wallet address from the originating chain
   * @param {object} [opts] - additional options
   * @param {string} [opts.channel="channel-39"]
   * @param {string} [opts.fallback=""]
   * @returns {Promise<Object>} - { address: "noble1...", exists: true }
   */
  async ensureForwardingAccount(hexAddress, opts = {}) {
    const channel = opts.channel || 'channel-39';
    const fallback = opts.fallback || '';

    // Check the cache first
    if (this.cache.has(hexAddress)) {
      return { address: this.cache.get(hexAddress), cached: true };
    }

    // Query Noble for an existing account
    let queryResp = await this.queryForwardingAccount({ channel, recipient: hexAddress, fallback });
    if (queryResp && queryResp.exists) {
      // Cache and return
      this.cache.set(hexAddress, queryResp.address);
      return { address: queryResp.address, cached: false };
    }

    // No existing account; attempt registration
    const registered = await this.registerForwardingAccount({ channel, recipient: hexAddress, fallback });
    if (!registered) {
      throw new Error('Failed to broadcast registration tx.');
    }

    // Wait before confirming (adjust delay based on expected tx processing time)
    await setTimeout(this.confirmationDelay);

    // Re-query to confirm registration
    queryResp = await this.queryForwardingAccount({ channel, recipient: hexAddress, fallback });
    if (queryResp && queryResp.exists) {
      // Cache and return
      this.cache.set(hexAddress, queryResp.address);
      return { address: queryResp.address, cached: false, newlyRegistered: true };
    } else {
      throw new Error('Unable to confirm forwarding account registration.');
    }
  }
}
