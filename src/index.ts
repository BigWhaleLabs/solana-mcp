#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import startServer from './server.js'
import { startHttpServer } from './http-server.js'
import * as dotenv from 'dotenv'

dotenv.config()

// Validate required environment variables
function validateEnvironment() {
  const requiredEnvVars = {
    SOLANA_PRIVATE_KEY: process.env.SOLANA_PRIVATE_KEY,
    RPC_URL: process.env.RPC_URL,
  }

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    )
  }
}

async function main() {
  try {
    // Validate environment before proceeding
    validateEnvironment()

    // Check if PORT environment variable exists to determine whether to use HTTP
    if (process.env.PORT) {
      const port = Number.parseInt(process.env.PORT, 10)
      console.error(`Starting Solana MCP server with HTTP on port ${port}`)
      await startHttpServer(port)
    } else {
      // Start the MCP server with stdio transport (original behavior)
      console.error('Starting Solana MCP server with stdio transport')
      const server = await startServer()
      const transport = new StdioServerTransport()
      await server.connect(transport)
      console.error('Solana MCP Server running on stdio')
    }
  } catch (error) {
    console.error(
      'Failed to start MCP server:',
      error instanceof Error ? error.message : String(error)
    )
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error in main():', error)
  process.exit(1)
})
