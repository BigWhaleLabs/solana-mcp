import { StdioServerTransport } from '@big-whale-labs/modelcontextprotocol-sdk/server/stdio.js'
import startServer from './server.js'
import getAvailableActions from './getAvailableActions.js'

// Start the server
async function main() {
  try {
    const server = await startServer(getAvailableActions())
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('EVM MCP Server running on stdio')
  } catch (error) {
    console.error('Error starting MCP server:', error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error in main():', error)
  process.exit(1)
})
