from pathlib import Path
import csv, datetime as dt, time, re, urllib.parse
import requests
from bs4 import BeautifulSoup

REGIONS = ["서울","경기","인천","강원","충북","충남","대전","세종","전북","전남","광주","경북","경남","대구","울산","부산","제주"]
BRANDS = {"알콘":["알콘","alcon","토탈원","토탈1","precision1","프리시전"], "쿠퍼":["쿠퍼","쿠퍼비전","coopervision","cooper","마이데이","바이오피니티"], "바슈롬":["바슈롬","bausch","울트라","인퓨즈"]}
EVENT_WORDS = ["행사","이벤트","체험","교육","세미나","프로모션","증정","할인","상담","렌즈"]

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

def clean(s):
    return re.sub(r"\s+", " ", re.sub("<.*?>", "", s or "")).strip()

def activity_type(text):
    if "교육" in text or "세미나" in text:
        return "교육/세미나"
    if "체험" in text or "증정" in text:
        return "체험/증정"
    if "할인" in text or "이벤트" in text or "프로모션" in text:
        return "프로모션"
    return "기타"

def search_naver_view(query, pages=2):
    items = []
    headers = {"User-Agent": "Mozilla/5.0"}
    for page in range(1, pages + 1):
        start = 1 + (page - 1) * 10
        url = "https://search.naver.com/search.naver?where=view&sm=tab_jum&query=" + urllib.parse.quote(query) + f"&start={start}"
        try:
            r = requests.get(url, headers=headers, timeout=15)
            soup = BeautifulSoup(r.text, "html.parser")
            links = soup.select("a.title_link, a.api_txt_lines, a.link_tit")
            for a in links[:10]:
                title = clean(a.get_text(" "))
                href = a.get("href", "")
                if not title or not href:
                    continue
                parent = a.find_parent()
                snippet = clean(parent.get_text(" "))[:300] if parent else title
                combined = title + " " + snippet
                if not any(w in combined for w in EVENT_WORDS):
                    continue
                items.append({"title": title, "url": href, "summary": snippet, "source": "naver_view", "query": query})
        except Exception as e:
            print("search failed", query, e)
        time.sleep(1)
    return items

def main():
    queries_path = Path("queries.txt")
    queries = [q.strip() for q in queries_path.read_text(encoding="utf-8").splitlines() if q.strip()] if queries_path.exists() else ["알콘 렌즈 행사","쿠퍼렌즈 이벤트","바슈롬 렌즈 교육"]
    all_rows = []
    for q in queries:
        for item in search_naver_view(q, pages=2):
            text = item["title"] + " " + item["summary"] + " " + q
            brand = guess_brand(text)
            region = guess_region(text)
            all_rows.append({
                "월": dt.datetime.now().strftime("%Y-%m"), "지역": region, "브랜드": brand, "활동유형": activity_type(text),
                "제목": item["title"], "요약": item["summary"], "URL": item["url"], "출처": item["source"], "검색어": item["query"],
                "알콘": 1 if brand == "알콘" else 0, "쿠퍼": 1 if brand == "쿠퍼" else 0, "바슈롬": 1 if brand == "바슈롬" else 0
            })
    dedup = {r["URL"]: r for r in all_rows}
    rows = list(dedup.values())
    out = Path("output"); out.mkdir(exist_ok=True)
    with (out / "Competitor_Activity.csv").open("w", encoding="utf-8-sig", newline="") as f:
        fieldnames = ["월","지역","브랜드","활동유형","제목","요약","URL","출처","검색어","알콘","쿠퍼","바슈롬"]
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"Created output/Competitor_Activity.csv rows={len(rows)}")

if __name__ == "__main__":
    main()
