import express from 'express';
import cluster from 'cluster';
import os from 'os';
import dotenv from 'dotenv';
import { NobleForwarding } from './nobleForwarding.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;
const numCPUs = os.cpus().length;

// Create an instance of NobleForwarding
const nobleForwarding = new NobleForwarding({
  grpcAddress: process.env.NOBLE_GRPC_ADDRESS || 'noble-grpc.example.com:443',
  protoPath: './noble.proto',
  confirmationDelay: 5000, // adjust as needed
});

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Middleware to parse JSON payloads
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/', (req, res) => res.status(200).send('USDC CCTP Noble Forwarding API is running'));

  /**
   * POST /process-forwarding
   *
   * Expected JSON payload:
   * { "hexAddress": "0xABC123...", "chain": "ethereum" }
   *
   * In a real-world scenario, additional validation and processing of the originating burn tx
   * would be done before calling ensureForwardingAccount.
   */
  app.post('/process-forwarding', async (req, res) => {
    const { hexAddress } = req.body;
    if (!hexAddress) {
      return res.status(400).json({ error: 'Hex address is required.' });
    }
    try {
      const result = await nobleForwarding.ensureForwardingAccount(hexAddress);
      res.json({
        message: result.newlyRegistered
          ? 'Forwarding account registered successfully.'
          : 'Forwarding account exists.',
        nobleAddress: result.address,
        fromCache: result.cached || false,
      });
    } catch (error) {
      console.error(`Error processing forwarding account: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(port, () => {
    console.log(`Worker ${process.pid} is running API on http://localhost:${port}`);
  });
}
