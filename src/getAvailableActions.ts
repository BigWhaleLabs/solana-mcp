import { SolanaAgentKit, KeypairWallet, type Action } from 'solana-agent-kit'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import TokenPlugin from '@solana-agent-kit/plugin-token'
import NFTPlugin from '@solana-agent-kit/plugin-nft'
import DefiPlugin from '@solana-agent-kit/plugin-defi'
import MiscPlugin from '@solana-agent-kit/plugin-misc'
import BlinksPlugin from '@solana-agent-kit/plugin-blinks'

export default function getAvailableActions() {
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
    .use(MiscPlugin)
    .use(BlinksPlugin)

  const mcp_actions: Record<string, Action> = {}

  for (const action of agent.actions) {
    mcp_actions[action.name] = action
  }

  return mcp_actions
}
