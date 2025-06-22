import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { type Action, SolanaAgentKit } from 'solana-agent-kit'
import { z } from 'zod'
import extractPrivyHeaders from './extractPrivyHeaders.js'
import { Keypair, PublicKey } from '@solana/web3.js'
import { PrivyBaseWallet } from './privyWallet.js'
import TokenPlugin from '@solana-agent-kit/plugin-token'
import NFTPlugin from '@solana-agent-kit/plugin-nft'
import DefiPlugin from '@solana-agent-kit/plugin-defi'
import MiscPlugin from '@solana-agent-kit/plugin-misc'
import BlinksPlugin from '@solana-agent-kit/plugin-blinks'

// Define the raw shape type that MCP tools expect
export type MCPSchemaShape = {
  [key: string]: z.ZodType<any>
}

// Type guards for Zod schema types
function isZodOptional(schema: z.ZodTypeAny): schema is z.ZodOptional<any> {
  return schema instanceof z.ZodOptional
}

function isZodObject(schema: z.ZodTypeAny): schema is z.ZodObject<any> {
  // Check both instanceof and the typeName property
  return schema instanceof z.ZodObject || schema?._def?.typeName === 'ZodObject'
}

/**
 * Converts a Zod object schema to a flat shape for MCP tools
 * @param schema The Zod schema to convert
 * @returns A flattened schema shape compatible with MCP tools
 * @throws Error if the schema is not an object type
 */
export function zodToMCPShape(schema: z.ZodTypeAny): {
  result: MCPSchemaShape
  keys: string[]
} {
  if (!isZodObject(schema)) {
    throw new Error('MCP tools require an object schema at the top level')
  }

  const shape = schema.shape
  const result: MCPSchemaShape = {}

  for (const [key, value] of Object.entries(shape)) {
    result[key] = isZodOptional(value as any) ? (value as any).unwrap() : value
  }

  return {
    result,
    keys: Object.keys(result),
  }
}

// Create and start the MCP server
async function startServer(actions: Record<string, Action>) {
  try {
    // Create a new MCP server instance
    const server = new McpServer({
      name: 'sol-mcp',
      version: '1.0.0',
    })

    // Register all resources, tools, and prompts
    // Convert each action to an MCP tool
    for (const [_key, action] of Object.entries(actions)) {
      const { result } = zodToMCPShape(action.schema)
      // @ts-ignore Type instantiation is excessively deep and possibly infinite.
      server.tool(
        action.name,
        action.description,
        result,
        async (params, extra) => {
          try {
            const privyConfig = extractPrivyHeaders(extra)

            const walletPublicKey = new PublicKey(
              privyConfig.privyWalletAddress
            )
            const privyWallet = new PrivyBaseWallet(
              walletPublicKey,
              privyConfig.privyWalletId,
              privyConfig.privyAppId,
              privyConfig.privyAppSecret,
              privyConfig.privyAuthorizationPrivateKey,
              'mainnet'
            )

            const solanaAgentKit = new SolanaAgentKit(
              privyWallet,
              process.env.RPC_URL as string,
              {}
            )
              .use(TokenPlugin)
              .use(NFTPlugin)
              .use(DefiPlugin)
              .use(MiscPlugin)
              .use(BlinksPlugin)

            console.log('params', params)

            // Execute the action handler with the params directly
            const result = await action.handler(solanaAgentKit, params)

            // Format the result as MCP tool response
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(result, null, 2),
                },
              ],
            } as const
          } catch (error) {
            console.error('error', error)
            // Handle errors in MCP format
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text:
                    error instanceof Error
                      ? error.message
                      : 'Unknown error occurred',
                },
              ],
            } as const
          }
        }
      )

      // Add examples as prompts if they exist
      if (action.examples && action.examples.length > 0) {
        // @ts-ignore Type instantiation is excessively deep and possibly infinite.
        server.prompt(
          `${action.name}-examples`,
          {
            showIndex: z
              .string()
              .optional()
              .describe('Example index to show (number)'),
          },
          (args) => {
            const showIndex = args.showIndex
              ? parseInt(args.showIndex)
              : undefined
            const examples = action.examples.flat()
            const selectedExamples =
              typeof showIndex === 'number' ? [examples[showIndex]] : examples

            const exampleText = selectedExamples
              .map(
                (ex, idx) => `
Example ${idx + 1}:
Input: ${JSON.stringify(ex.input, null, 2)}
Output: ${JSON.stringify(ex.output, null, 2)}
Explanation: ${ex.explanation}
            `
              )
              .join('\n')

            return {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Examples for ${action.name}:\n${exampleText}`,
                  },
                },
              ],
            }
          }
        )
      }
    }
    // Log server information
    console.error(`EVM MCP Server initialized`)
    console.error('Server is ready to handle requests')

    return server
  } catch (error) {
    console.error('Failed to initialize server:', error)
    process.exit(1)
  }
}

// Export the server creation function
export default startServer
