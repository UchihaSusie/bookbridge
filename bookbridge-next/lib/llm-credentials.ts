import prisma from '@/lib/prisma'

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
}

export interface LLMCredentials {
  llm_api_key: string
  llm_base_url: string
  llm_model: string
}

export async function getUserLLMCredentials(
  clerkId: string
): Promise<LLMCredentials | null> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { apiKey: true, apiProvider: true, apiBaseUrl: true },
  })

  if (!user?.apiKey) return null

  const provider = user.apiProvider || 'openai'
  const defaults = PROVIDER_DEFAULTS[provider]
  return {
    llm_api_key: user.apiKey,
    llm_base_url: user.apiBaseUrl || defaults?.baseUrl || '',
    llm_model: defaults?.model || 'gpt-4o-mini',
  }
}
