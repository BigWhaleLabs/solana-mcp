import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SolanaAgentKit, KeypairWallet, type Action } from 'solana-agent-kit'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import TokenPlugin from '@solana-agent-kit/plugin-token'
import DefiPlugin from '@solana-agent-kit/plugin-defi'
import NFTPlugin from '@solana-agent-kit/plugin-nft'
import { registerSolanaTools } from './tools.js'
import { registerSolanaPrompts } from './prompts.js'

function createSolanaAgent(): SolanaAgentKit {
  const decodedPrivateKey = bs58.decode(
    process.env.SOLANA_PRIVATE_KEY as string
  )
  const keypair = Keypair.fromSecretKey(decodedPrivateKey)
  const keypairWallet = new KeypairWallet(
    keypair,
    process.env.RPC_URL as string
  )

  const agent = new SolanaAgentKit(keypairWallet, keypairWallet.rpcUrl, {})
    .use(TokenPlugin)
    .use(NFTPlugin)
    .use(DefiPlugin)

  return agent
}

async function startServer() {
  try {
    const agent = createSolanaAgent()

    const server = new McpServer({
      name: 'Solana-Agent-Kit-Server',
      version: '0.0.1',
    })

    registerSolanaTools(server, agent)
    registerSolanaPrompts(server, agent)

    console.error('Solana MCP Server initialized')
    console.error(`Connected to RPC: ${process.env.RPC_URL}`)
    console.error('Server is ready to handle requests')

    return server
  } catch (error) {
    console.error('Failed to initialize Solana server:', error)
    process.exit(1)
  }
}

export default startServer

export { createSolanaAgent }
