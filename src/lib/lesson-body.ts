/**
 * 渲染后的课程正文两处后处理，都发生在课页模板里（Markdown 只在这两处被渲染）：
 *
 * 1. 补 base 前缀：正文里的站内链接写成 base 中立的形式（/learn/<slug>/），
 *    Astro 7.3 的 Sätteri Markdown 管线不再接受 remark 插件（除非额外装
 *    @astrojs/markdown-remark），所以在 HTML 产物上补前缀；把 /agentviz 抄进
 *    几十课 Markdown 同样不可取——换 base 就会变成一次全站内容改写。
 * 2. 按「演示数据说明」小节一分为二，中间插课末自测。zh 的末节标题是
 *    「演示数据说明」、en 是「About the demo data」，两套正文都把它放在最后，
 *    所以切在标题前即等价于「带走三句话之后、演示数据说明之前」。
 */
export interface PreparedLessonBody {
	main: string;
	note: string;
}

const INTERNAL_HREF = /href="(\/(?:en\/)?(?:learn|lab|references|about)\/[^"]*)"/g;
const NOTE_HEADING = /<h2\b[^>]*>\s*(?:演示数据说明|About the demo data)\s*<\/h2>/;

export function prepareLessonBody(html: string, base: string): PreparedLessonBody {
	const prefixed = html.replace(INTERNAL_HREF, (_match, path: string) => `href="${base}${path}"`);
	const match = NOTE_HEADING.exec(prefixed);
	if (!match) return { main: prefixed, note: '' };
	return { main: prefixed.slice(0, match.index), note: prefixed.slice(match.index) };
}
