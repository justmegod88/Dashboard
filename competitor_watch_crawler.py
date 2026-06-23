from pathlib import Path
import csv
import datetime as dt
import html
import json
import os
import re
import time
import urllib.parse
import urllib.request
from collections import OrderedDict

TODAY = dt.datetime.now().date()

# KPI 기준
# - 최근 7일: 긴급 알림
# - 최근 30일: 대시보드 경쟁사 KPI
# - 최근 90일: 추세 관찰
PERIOD_DAYS = 90

REGIONS = ["서울","경기","인천","강원","충북","충남","대전","세종","전북","전남","광주","경북","경남","대구","울산","부산","제주"]

BRANDS = {
    "알콘": ["알콘", "alcon", "토탈원", "토탈1", "total1", "precision1", "프리시전", "워터렌즈"],
    "쿠퍼": ["쿠퍼", "쿠퍼비전", "coopervision", "cooper", "마이데이", "myday", "바이오피니티", "biofinity"],
    "바슈롬": ["바슈롬", "bausch", "울트라", "ultra", "인퓨즈", "infuse", "레이셀"],
}

EVENT_WORDS = ["행사","이벤트","체험","교육","세미나","프로모션","증정","할인","상담","렌즈","원데이","콘택트","콘택트렌즈","사은품","쿠폰","신제품","착용"]

def strip_html(text):
    text = html.unescape(text or "")
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def guess_region(text):
    for r in REGIONS:
        if r in text:
            return r
    return "미분류"

def guess_brand(text):
    low = text.lower()
    for brand, keys in BRANDS.items():
        if any(k.lower() in low for k in keys):
            return brand
    return "경쟁사"

def activity_type(text):
    if "교육" in text or "세미나" in text:
        return "교육/세미나"
    if "체험" in text or "증정" in text or "사은품" in text:
        return "체험/증정"
    if "할인" in text or "이벤트" in text or "프로모션" in text or "행사" in text or "쿠폰" in text:
        return "프로모션"
    if "신제품" in text:
        return "신제품"
    return "게시글"

def parse_naver_blog_date(postdate):
    # Naver blog API postdate: YYYYMMDD
    try:
        return dt.datetime.strptime(str(postdate), "%Y%m%d").date()
    except Exception:
        return TODAY

def period_flags(post_date):
    age = (TODAY - post_date).days
    return {
        "경과일": age,
        "최근7일": 1 if age <= 7 else 0,
        "최근30일": 1 if age <= 30 else 0,
        "최근90일": 1 if age <= 90 else 0,
    }

def naver_search_blog(query, display=50, starts=(1, 51)):
    client_id = os.environ.get("NAVER_CLIENT_ID") or os.environ.get("CLIENT_ID")
    client_secret = os.environ.get("NAVER_CLIENT_SECRET") or os.environ.get("CLIENT_SECRET")
    if not client_id or not client_secret:
        raise RuntimeError("NAVER_CLIENT_ID/NAVER_CLIENT_SECRET 또는 CLIENT_ID/CLIENT_SECRET Secret이 없습니다.")

    results = []
    for start in starts:
        params = urllib.parse.urlencode({
            "query": query,
            "display": display,
            "start": start,
            "sort": "date",
        })
        url = "https://openapi.naver.com/v1/search/blog.json?" + params
        req = urllib.request.Request(url)
        req.add_header("X-Naver-Client-Id", client_id)
        req.add_header("X-Naver-Client-Secret", client_secret)
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                status = response.getcode()
                body = response.read().decode("utf-8")
                print("NAVER API", status, query, "start", start)
                data = json.loads(body)
                results.extend(data.get("items", []))
        except Exception as e:
            print("NAVER API failed:", query, start, repr(e))
        time.sleep(0.3)
    return results

def build_row(item, query):
    title = strip_html(item.get("title", ""))
    desc = strip_html(item.get("description", ""))
    link = item.get("link", "")
    blogger = strip_html(item.get("bloggername", ""))
    post_date = parse_naver_blog_date(item.get("postdate", ""))
    flags = period_flags(post_date)
    text = f"{title} {desc} {blogger} {query}"
    brand = guess_brand(text)

    return {
        "월": TODAY.strftime("%Y-%m"),
        "게시일": post_date.isoformat(),
        "경과일": flags["경과일"],
        "최근7일": flags["최근7일"],
        "최근30일": flags["최근30일"],
        "최근90일": flags["최근90일"],
        "지역": guess_region(text),
        "브랜드": brand,
        "활동유형": activity_type(text),
        "제목": title[:180],
        "요약": desc[:350],
        "URL": link,
        "출처": "naver_blog_api",
        "검색어": query,
        "블로그명": blogger,
        "알콘": 1 if brand == "알콘" else 0,
        "쿠퍼": 1 if brand == "쿠퍼" else 0,
        "바슈롬": 1 if brand == "바슈롬" else 0,
    }

def main():
    queries_path = Path("queries.txt")
    if queries_path.exists():
        queries = [q.strip() for q in queries_path.read_text(encoding="utf-8").splitlines() if q.strip()]
    else:
        queries = [
            "알콘 렌즈 행사",
            "알콘 안경원 이벤트",
            "쿠퍼렌즈 이벤트",
            "쿠퍼비전 안경원",
            "바슈롬 렌즈 행사",
            "바슈롬 안경원 이벤트",
        ]

    rows_by_url = OrderedDict()

    for q in queries:
        items = naver_search_blog(q, display=50, starts=(1, 51))
        for item in items:
            row = build_row(item, q)
            # 최근 90일만 대시보드용으로 저장
            if int(row["최근90일"]) != 1:
                continue

            # 너무 무관한 결과는 제외. 단 검색어 브랜드가 있으면 유지.
            combined = f"{row['제목']} {row['요약']} {row['검색어']}"
            has_event = any(w in combined for w in EVENT_WORDS)
            has_brand = row["브랜드"] != "경쟁사"
            if not has_event and not has_brand:
                continue

            key = row["URL"] or f"{row['제목']}_{row['게시일']}"
            rows_by_url[key] = row

    rows = list(rows_by_url.values())

    # 0건이면 이유 확인용 row를 남김
    if not rows:
        for q in queries[:8]:
            brand = guess_brand(q)
            rows.append({
                "월": TODAY.strftime("%Y-%m"),
                "게시일": TODAY.isoformat(),
                "경과일": 0,
                "최근7일": 1,
                "최근30일": 1,
                "최근90일": 1,
                "지역": "미분류",
                "브랜드": brand,
                "활동유형": "검색결과 없음",
                "제목": f"{q} 검색 결과 없음",
                "요약": "네이버 검색 API는 호출됐지만 최근 90일 조건에 맞는 결과가 없거나 필터에서 제외되었습니다.",
                "URL": "#",
                "출처": "naver_api_status",
                "검색어": q,
                "블로그명": "",
                "알콘": 1 if brand == "알콘" else 0,
                "쿠퍼": 1 if brand == "쿠퍼" else 0,
                "바슈롬": 1 if brand == "바슈롬" else 0,
            })

    out = Path("output")
    out.mkdir(exist_ok=True)
    fieldnames = [
        "월","게시일","경과일","최근7일","최근30일","최근90일",
        "지역","브랜드","활동유형","제목","요약","URL","출처","검색어","블로그명",
        "알콘","쿠퍼","바슈롬"
    ]
    with (out / "Competitor_Activity.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Created output/Competitor_Activity.csv rows={len(rows)}")

if __name__ == "__main__":
    main()
