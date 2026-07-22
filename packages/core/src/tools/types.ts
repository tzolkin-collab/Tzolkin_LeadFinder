import { z } from 'zod';

/**
 * Schema Anthropic/Claude tool definition for Function Calling.
 * Compatible with Claude API (tools parameter).
 */
export interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * Schema OpenAI tool definition for Function Calling.
 * Compatible with OpenAI API (tools parameter).
 */
export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

/**
 * Core Tool interface.
 * Every integration service (google-places, instagram, meta-ads, etc.)
 * must implement this interface to be usable as an agent tool.
 */
export interface Tool<TInput, TOutput> {
  /** Unique tool identifier, used in function calling */
  readonly name: string;
  /** Human-readable description for the agent to decide when to use this tool */
  readonly description: string;
  /** Zod schema for validating tool input */
  readonly inputSchema: z.ZodType<TInput>;
  /** Execute the tool with validated input */
  execute(input: TInput): Promise<ToolResult<TOutput>>;
  /** Export as Anthropic Claude tool definition */
  toAnthropicTool(): AnthropicToolDefinition;
  /** Export as OpenAI tool definition */
  toOpenAITool(): OpenAIToolDefinition;
}

/**
 * Generic tool result discriminated union with status and timing metadata.
 */
export type ToolResult<T> =
  | {
      success: true;
      data: T;
      error?: undefined;
      executedAt: Date;
      durationMs: number;
    }
  | {
      success: false;
      data?: undefined;
      error: string;
      executedAt: Date;
      durationMs: number;
    };
