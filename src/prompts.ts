import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SolanaAgentKit } from 'solana-agent-kit'
import { z } from 'zod'

/**
 * Register all Solana prompts with the MCP server
 */
export function registerSolanaPrompts(
  server: McpServer,
  solanaAgentKit: SolanaAgentKit
) {
  console.error('Registering Solana prompts...')

  // Get all actions from the agent
  const actions = solanaAgentKit.actions
  let promptCount = 0

  // Add examples as prompts if they exist
  for (const action of actions) {
    if (action.examples && action.examples.length > 0) {
      try {
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

        promptCount++
        console.error(`Registered prompt: ${action.name}-examples`)
      } catch (error) {
        console.error(`Failed to register prompt for ${action.name}:`, error)
      }
    }
  }

  // Add a general help prompt
  // @ts-ignore Type instantiation is excessively deep and possibly infinite.
  server.prompt(
    'solana-help',
    {
      category: z
        .string()
        .optional()
        .describe(
          'Category of tools to show help for (token, defi, nft, general)'
        ),
    },
    (args) => {
      const category = args.category?.toLowerCase()
      const filteredActions = category
        ? actions.filter(
            (action) =>
              action.name.toLowerCase().includes(category) ||
              action.description.toLowerCase().includes(category)
          )
        : actions

      const helpText = filteredActions
        .map(
          (action) => `
## ${action.name}
**Description:** ${action.description}
**Category:** ${
            action.name.includes('token')
              ? 'Token'
              : action.name.includes('nft')
              ? 'NFT'
              : action.name.includes('defi') || action.name.includes('swap')
              ? 'DeFi'
              : 'General'
          }
        `
        )
        .join('\n')

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# Solana Agent Kit Tools\n\nAvailable tools${
                category ? ` (filtered by: ${category})` : ''
              }:\n\n${helpText}`,
            },
          },
        ],
      }
    }
  )

  promptCount++
  console.error('Registered prompt: solana-help')

  console.error(`Finished registering ${promptCount} Solana prompts`)
}
