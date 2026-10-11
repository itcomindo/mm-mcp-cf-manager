export function parseToolTextJson(content: unknown): unknown {
  if (!content || typeof content !== 'object') {
    throw new Error('Invalid MCP tool content')
  }
  const record = content as { content?: Array<{ type?: string; text?: string }> }
  const textPart = record.content?.find((part) => part.type === 'text' && part.text)
  if (!textPart?.text) {
    throw new Error('MCP tool returned no text content')
  }
  return JSON.parse(textPart.text) as unknown
}
