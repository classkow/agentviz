#!/usr/bin/env python3
"""Self-check for AgentViz lesson quizzes (delivered as part of mission R4-O).

Verifies, for every lesson that carries a quiz:
  * every quiz file parses as UTF-8 JSON with exactly 3 questions,
    each with 3-4 unique options and an in-range zero-based answer index;
  * zh and en pairs align per lesson (same question count, same order,
    same answer index, same option count);
  * every explanation citation (见「…」一节 / See the "..." section)
    matches an exact h2 heading that exists in the lesson markdown
    (zh -> src/content/lessons/, en -> src/content/lessons-en/);
  * number cross-check: every digit-run in question+options+explanation
    appears in the lesson markdown body OR its demo json.

Exit code 0 with "ALL QUIZZES PASS" only when every check is clean.
Exit code 1 and a violation list otherwise.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ZQ = ROOT / "src" / "content" / "quizzes"
EQ = ROOT / "src" / "content" / "quizzes" / "en"
ZL = ROOT / "src" / "content" / "lessons"
EL = ROOT / "src" / "content" / "lessons-en"
DE = ROOT / "src" / "demos"

H2_RE = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)
# Citations: zh uses the book-bracket form; en uses the straight-quote form.
CITE_ZH_RE = re.compile(r"见「(?P<s>[^」]+)」一节")
CITE_EN_RE = re.compile(r'See the "(?P<s>[^"]+)" section')
DIGIT_RE = re.compile(r"\d+(?:[.,]\d+)*")
FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
DEMO_KEY_RE = re.compile(r"^demo:\s*\"?([\w.{}-]+)\"?\s*$", re.MULTILINE)

EXPECTED_QUESTIONS = 3
VALID_OPTION_SIZES = (3, 4)


def slug_from_json(path: Path) -> str:
    return path.stem


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def extract_h2s(md: str) -> list[str]:
    return [m.group(1).strip() for m in H2_RE.finditer(md)]


def extract_demo_slug(md: str) -> str | None:
    front_m = FRONTMATTER_RE.match(md)
    if not front_m:
        return None
    front = front_m.group(1)
    demo_match = DEMO_KEY_RE.search(front)
    return demo_match.group(1) if demo_match else None


def collect_numbers(*texts: str) -> set[str]:
    out: set[str] = set()
    for t in texts:
        for m in DIGIT_RE.findall(t):
            # normalise to a comparison key: strip thousands separators & trailing .
            # keep both the raw form and a dotless form so that
            # "1,070" (demo) matches "1070" (lesson prose) and vice versa.
            raw = m
            dotless = raw.replace(",", "").replace(".", "")
            out.add(raw)
            out.add(dotless)
    return out


def check_quiz_file(path: Path, violations: list[str]) -> dict:
    if not path.exists():
        violations.append(f"[missing] {path.relative_to(ROOT)}")
        return {}
    try:
        data = json.loads(read_text(path))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        violations.append(f"[parse] {path.relative_to(ROOT)}: {exc}")
        return {}
    questions = data.get("questions")
    if not isinstance(questions, list):
        violations.append(f"[schema] {path.relative_to(ROOT)}: missing 'questions'")
        return {}
    if len(questions) != EXPECTED_QUESTIONS:
        violations.append(
            f"[count] {path.relative_to(ROOT)}: expected {EXPECTED_QUESTIONS} questions, "
            f"found {len(questions)}"
        )
    for i, q in enumerate(questions):
        for field in ("question", "options", "answer", "explanation"):
            if field not in q:
                violations.append(
                    f"[schema] {path.relative_to(ROOT)}: question[{i}] missing '{field}'"
                )
        options = q.get("options", [])
        if not isinstance(options, list) or len(options) not in VALID_OPTION_SIZES:
            violations.append(
                f"[options] {path.relative_to(ROOT)}: question[{i}] has "
                f"{len(options) if isinstance(options, list) else type(options).__name__} "
                f"options, expected {list(VALID_OPTION_SIZES)}"
            )
        elif len(set(options)) != len(options):
            violations.append(
                f"[options] {path.relative_to(ROOT)}: question[{i}] has duplicate option text"
            )
        ans = q.get("answer")
        if not isinstance(ans, int) or isinstance(ans, bool) or not (0 <= ans < len(options)):
            violations.append(
                f"[answer] {path.relative_to(ROOT)}: question[{i}] answer={ans!r} "
                f"not a zero-based index into {len(options)} options"
            )
    return data


def check_citations(
    quiz: dict,
    lesson_md: str,
    h2s: list[str],
    is_en: bool,
    path: Path,
    violations: list[str],
) -> None:
    cite_re = CITE_EN_RE if is_en else CITE_ZH_RE
    for i, q in enumerate(quiz.get("questions", [])):
        explanation = q.get("explanation", "")
        # every explanation must carry at least one citation
        if not cite_re.search(explanation):
            violations.append(
                f"[cite] {path.relative_to(ROOT)}: question[{i}] explanation has no "
                f"{'en' if is_en else 'zh'}-form citation"
            )
            continue
        for cite in cite_re.finditer(explanation):
            cited = cite.group("s").strip()
            if cited not in h2s:
                violations.append(
                    f"[cite] {path.relative_to(ROOT)}: question[{i}] cites "
                    f"'{cited}' but that is not an h2 of this lesson "
                    f"(available: {h2s})"
                )


def check_alignment(zh: dict, en: dict, zh_path: Path, en_path: Path, violations: list[str]) -> None:
    z = zh.get("questions", [])
    e = en.get("questions", [])
    if len(z) != len(e):
        violations.append(
            f"[align] {zh_path.relative_to(ROOT)} vs {en_path.relative_to(ROOT)}: "
            f"question counts differ ({len(z)} vs {len(e)})"
        )
        return
    for i, (zq, eq) in enumerate(zip(z, e)):
        if zq.get("answer") != eq.get("answer"):
            violations.append(
                f"[align] {zh_path.relative_to(ROOT)} vs {en_path.relative_to(ROOT)}: "
                f"question[{i}] answer differs ({zq.get('answer')} vs {eq.get('answer')})"
            )
        zn = len(zq.get("options", []))
        en_ = len(eq.get("options", []))
        if zn != en_:
            violations.append(
                f"[align] {zh_path.relative_to(ROOT)} vs {en_path.relative_to(ROOT)}: "
                f"question[{i}] option counts differ ({zn} vs {en_})"
            )


def check_numbers(
    quiz: dict,
    lesson_md: str,
    demo_text: str,
    path: Path,
    violations: list[str],
) -> None:
    allowed = collect_numbers(lesson_md, demo_text)
    for i, q in enumerate(quiz.get("questions", [])):
        blob = " \x00 ".join(
            [q.get("question", ""), *q.get("options", []), q.get("explanation", "")]
        )
        for num in DIGIT_RE.findall(blob):
            raw = num
            dotless = raw.replace(",", "").replace(".", "")
            if raw not in allowed and dotless not in allowed:
                violations.append(
                    f"[num] {path.relative_to(ROOT)}: question[{i}] uses '{raw}' "
                    f"that appears in neither the lesson body nor its demo JSON"
                )


def main() -> int:
    violations: list[str] = []
    slugs: list[str] = sorted(p.stem for p in ZQ.glob("*.json") if p.stem.lower() != "en")

    print(f"Scanning {len(slugs)} quiz slugs under {ZQ.relative_to(ROOT)}/\n")
    checked_cits = 0
    checked_nums = 0
    checked_align = 0

    for slug in slugs:
        zh_path = ZQ / f"{slug}.json"
        en_path = EQ / f"{slug}.json"
        zh_md_path = ZL / f"{slug}.md"
        en_md_path = EL / f"{slug}.md"

        if not zh_path.exists():
            violations.append(f"[missing] {zh_path.relative_to(ROOT)}")
            continue
        if not en_path.exists():
            violations.append(f"[missing] {en_path.relative_to(ROOT)}")
            continue
        if not zh_md_path.exists():
            violations.append(f"[missing] {zh_md_path.relative_to(ROOT)}")
            continue
        if not en_md_path.exists():
            violations.append(f"[missing] {en_md_path.relative_to(ROOT)}")
            continue

        zh_quiz = check_quiz_file(zh_path, violations)
        en_quiz = check_quiz_file(en_path, violations)

        zh_md = read_text(zh_md_path)
        en_md = read_text(en_md_path)
        zh_h2s = extract_h2s(zh_md)
        en_h2s = extract_h2s(en_md)

        # demo json text (optional; shared by zh and en)
        demo_slug = extract_demo_slug(zh_md)
        demo_text = ""
        if demo_slug:
            demo_path = DE / f"{demo_slug}.json"
            if demo_path.exists():
                demo_text = read_text(demo_path)

        check_citations(zh_quiz, zh_md, zh_h2s, is_en=False, path=zh_path, violations=violations)
        check_citations(en_quiz, en_md, en_h2s, is_en=True, path=en_path, violations=violations)
        checked_cits += sum(len(q) for q in (zh_quiz.get("questions", []), en_quiz.get("questions", [])))

        check_alignment(zh_quiz, en_quiz, zh_path, en_path, violations)
        checked_align += 1

        check_numbers(zh_quiz, zh_md, demo_text, zh_path, violations)
        check_numbers(en_quiz, en_md, demo_text, en_path, violations)
        checked_nums += sum(len(q) for q in (zh_quiz.get("questions", []), en_quiz.get("questions", [])))

    print(f"lessons checked      : {len(slugs)}")
    print(f"zh/en pairs aligned  : {checked_align}")
    print(f"questions scanned    : {checked_cits} (zh and en each)")
    print(f"number checks        : {checked_nums}")
    print()

    if violations:
        print(f"VIOLATIONS ({len(violations)}):", file=sys.stderr)
        for v in violations:
            print(f"  - {v}", file=sys.stderr)
        return 1

    print("ALL QUIZZES PASS (schema, alignment, citations, numbers)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
