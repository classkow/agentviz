/**
 * 内容复审节奏，两套站点共用：距 reviewed_at 超过 STALE_AFTER_DAYS 天，课页审校行
 * 旁挂「建议复审」；RECENT_WITHIN_DAYS 天内的课在课程索引卡上挂「最近更新」角标。
 */
export const STALE_AFTER_DAYS = 90;
export const RECENT_WITHIN_DAYS = 21;

const DAY_MS = 86_400_000;

export interface ReviewStatus {
	stale: boolean;
	recent: boolean;
}

/**
 * `now` 注入而非内部取时钟：构建期调用方用 new Date()，测试传固定日期，
 * 这样 90/21 两个边界不会因为跑测试的日期变化而漂。
 */
export function reviewStatus(reviewedAt: Date, now: Date = new Date()): ReviewStatus {
	const days = Math.floor((now.getTime() - reviewedAt.getTime()) / DAY_MS);
	return { stale: days > STALE_AFTER_DAYS, recent: days <= RECENT_WITHIN_DAYS };
}

export function isoDay(date: Date): string {
	return date.toISOString().slice(0, 10);
}
