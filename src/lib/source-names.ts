/**
 * 官方来源域名 → 可读文档站名。两套课页模板与参考库聚合页共用，
 * 新增域名只改这一处。
 */
export const SOURCE_NAMES: Record<string, string> = {
	'platform.openai.com': 'OpenAI Platform Docs',
	'docs.anthropic.com': 'Anthropic Docs',
	'anthropic.com': 'Anthropic Docs',
	'help.openai.com': 'OpenAI Help Center',
	'learn.microsoft.com': 'Microsoft Learn',
	'python.langchain.com': 'LangChain Docs',
	'docs.cohere.com': 'Cohere Docs',
	'openai.com': 'OpenAI',
	'github.com': 'GitHub',
	'docs.ragas.io': 'Ragas Docs',
	'api-docs.deepseek.com': 'DeepSeek API Docs',
	'huggingface.co': 'HuggingFace Docs',
	'developer.mozilla.org': 'MDN Web Docs',
	'arxiv.org': 'arXiv',
	'modelcontextprotocol.io': 'MCP Docs'
};

/**
 * Unmapped hosts fall back to the hostname itself. `www.` is stripped before
 * the lookup, so both `anthropic.com` and `www.anthropic.com` resolve.
 */
export function sourceName(url: string): string {
	const host = new URL(url).hostname.replace(/^www\./, '');
	return SOURCE_NAMES[host] ?? host;
}
