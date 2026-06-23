from pathlib import Path
import csv, json, os, traceback
from collections import Counter

csv_path = Path("output/Competitor_Activity.csv")
out_path = Path("output/ai_report.json")
out_path.parent.mkdir(exist_ok=True)

def read_rows():
    if not csv_path.exists():
        return []
    try:
        with csv_path.open(encoding="utf-8-sig") as f:
            return list(csv.DictReader(f))
    except Exception:
        return []

def write_fallback(reason=""):
    rows = read_rows()
    brand_counts = Counter(r.get("브랜드", "미분류") for r in rows)
    region_counts = Counter(r.get("지역", "미분류") for r in rows)
    type_counts = Counter(r.get("활동유형", "기타") for r in rows)
    report = {
        "summary": f"총 {len(rows)}건의 경쟁사/안경원 현장 활동이 수집되었습니다. 주요 브랜드는 {brand_counts.most_common(3)}이며, 지역별 분포는 {region_counts.most_common(5)}입니다.",
        "actions": [
            "경쟁사 활동이 많은 지역은 MAX/ASD/멀티포컬 콘텐츠를 우선 배포하세요.",
            "프로모션 게시글이 많은 경우 소비자 상담용 차별화 메시지를 강화하세요.",
            "교육/세미나 활동이 많은 경우 안경사 대상 전문성 콘텐츠로 대응하세요."
        ],
        "raw": {
            "total_posts": len(rows),
            "brand_counts": dict(brand_counts),
            "region_counts": dict(region_counts.most_common(10)),
            "type_counts": dict(type_counts),
            "reason": reason
        }
    }
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Wrote fallback ai_report.json:", reason)

try:
    rows = read_rows()
    brand_counts = Counter(r.get("브랜드", "미분류") for r in rows)
    region_counts = Counter(r.get("지역", "미분류") for r in rows)
    type_counts = Counter(r.get("활동유형", "기타") for r in rows)
    summary_data = {
        "total_posts": len(rows),
        "brand_counts": dict(brand_counts),
        "region_counts": dict(region_counts.most_common(10)),
        "type_counts": dict(type_counts),
        "sample_posts": rows[:10],
    }

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        write_fallback("OPENAI_API_KEY secret is missing")
        raise SystemExit(0)

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        prompt = f"""
아래는 알콘/쿠퍼/바슈롬 및 안경원 현장 게시글 크롤링 결과 요약입니다.
한국 콘택트렌즈 교육팀 관점에서 대시보드에 표시할 짧은 AI 리포트를 작성하세요.

조건:
- 한국어
- summary는 2~4문장
- actions는 3~5개
- 과장하지 말고 공개 게시글 기반이라는 한계를 감안
- ASD, MAX 블루라이트, 멀티포컬, 스마트피팅 교육 대응 관점 포함

데이터:
{json.dumps(summary_data, ensure_ascii=False)}
"""
        resp = client.responses.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4.1-mini"),
            input=prompt,
        )
        report = {
            "summary": resp.output_text.strip(),
            "actions": [
                "상위 활동 지역을 기준으로 ASD/MAX/멀티포컬 교육 대상을 우선 추출하세요.",
                "경쟁사 프로모션 게시글이 많은 지역에는 소비자 상담용 차별화 메시지를 배포하세요.",
                "교육/세미나 활동이 많은 브랜드 키워드를 다음 교육 콘텐츠 주제에 반영하세요."
            ],
            "raw": summary_data,
        }
        out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print("Created output/ai_report.json")
    except Exception as e:
        traceback.print_exc()
        write_fallback("OpenAI call failed: " + str(e))
        raise SystemExit(0)
except Exception as e:
    traceback.print_exc()
    write_fallback(str(e))
    raise SystemExit(0)
