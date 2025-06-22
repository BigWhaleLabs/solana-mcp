import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SolanaAgentKit, type Action } from 'solana-agent-kit'
import { z } from 'zod'

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

/**
 * Register all Solana tools with the MCP server
 */
export function registerSolanaTools(
  server: McpServer,
  solanaAgentKit: SolanaAgentKit
) {
  console.error('Registering Solana tools...')

  // Get all actions from the agent
  const actions: Record<string, Action> = {}
  for (const action of solanaAgentKit.actions) {
    actions[action.name] = action
  }

  console.error(`Found ${Object.keys(actions).length} actions to register`)

  // Convert each action to an MCP tool
  for (const [_key, action] of Object.entries(actions)) {
    try {
      const { result } = zodToMCPShape(action.schema)

      // Register the tool with the server
      // @ts-ignore Type instantiation is excessively deep and possibly infinite.
      server.tool(action.name, action.description, result, async (params) => {
        try {
          console.error(`Executing action: ${action.name}`)

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
          console.error(`Error executing action ${action.name}:`, error)

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
      })

      console.error(`Registered tool: ${action.name}`)
    } catch (error) {
      console.error(`Failed to register tool ${action.name}:`, error)
    }
  }

  console.error('Finished registering Solana tools')
}
