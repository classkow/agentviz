/**
 * 已读进度打卡：纯前端 localStorage，无依赖、无同步。
 * 存储键 agentviz-read-lessons，值为已读课 slug 的 JSON 数组。
 * 中英两站共用同一份记录（两站课 slug 成对相同，同一门课只算一次）。
 */

const READ_KEY = 'agentviz-read-lessons';

function asStringList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === 'string');
}

export function readSlugs(): string[] {
	try {
		const raw = localStorage.getItem(READ_KEY);
		return raw === null ? [] : asStringList(JSON.parse(raw));
	} catch {
		// 隐私模式 / 配额异常下退回到「无记录」，打卡功能失效但页面照常。
		return [];
	}
}

function writeSlugs(slugs: string[]): void {
	try {
		localStorage.setItem(READ_KEY, JSON.stringify(slugs));
	} catch {
		// 写入失败时本次会话内的按钮状态仍然可用，只是不跨页持久。
	}
}

export function setRead(slug: string, read: boolean): void {
	const current = readSlugs().filter((entry) => entry !== slug);
	if (read) current.push(slug);
	writeSlugs(current);
}

/** slug 的前缀字母即模块号（e01-… → E），因此模块统计无需额外索引数据。 */
function moduleOf(slug: string): string {
	return slug.charAt(0).toUpperCase();
}

/**
 * 激活当前页面上的已读标记。所有受控元素在 HTML 里都以 `hidden` 预置，
 * 无 JS 时保持隐藏，页面形态与打卡功能上线前一致。
 */
export function initReadProgress(): void {
	const read = new Set(readSlugs());

	for (const el of document.querySelectorAll<HTMLElement>('[data-read-badge]')) {
		if (read.has(el.dataset.readBadge ?? '')) el.hidden = false;
	}

	const counts = new Map<string, number>();
	for (const slug of read) {
		const key = moduleOf(slug);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	for (const el of document.querySelectorAll<HTMLElement>('[data-read-module]')) {
		const done = counts.get(el.dataset.readModule ?? '') ?? 0;
		el.textContent = `${done}/${el.dataset.readTotal ?? '0'} ${el.dataset.readUnit ?? ''}`.trim();
		el.hidden = done === 0;
	}

	for (const el of document.querySelectorAll<HTMLButtonElement>('button[data-read-toggle]')) {
		const slug = el.dataset.readToggle;
		if (!slug) continue;
		const paint = (isRead: boolean) => {
			el.textContent = isRead
				? (el.dataset.labelRead ?? '')
				: (el.dataset.labelUnread ?? '');
			el.setAttribute('aria-pressed', String(isRead));
		};
		el.hidden = false;
		paint(read.has(slug));
		el.addEventListener('click', () => {
			const next = !read.has(slug);
			setRead(slug, next);
			if (next) read.add(slug);
			else read.delete(slug);
			paint(next);
		});
	}
}
