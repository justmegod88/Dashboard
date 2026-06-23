from pathlib import Path
import csv, json, os, datetime as dt
from collections import Counter

OUT = Path('output')
CSV_PATH = OUT / 'Competitor_Activity.csv'
AI_PATH = OUT / 'ai_report.json'

def read_rows():
    if not CSV_PATH.exists():
        return []
    with CSV_PATH.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

def count(rows, key):
    return Counter((r.get(key) or '미분류').strip() or '미분류' for r in rows)

def rule_report(rows):
    total = len(rows)
    brand = count(rows, '브랜드')
    region = count(rows, '지역')
    typ = count(rows, '활동유형')
    top_brand = ', '.join([f'{k} {v}건' for k,v in brand.most_common(3)]) or '브랜드 데이터 없음'
    top_region = ', '.join([f'{k} {v}건' for k,v in region.most_common(3)]) or '지역 데이터 없음'
    top_type = ', '.join([f'{k} {v}건' for k,v in typ.most_common(3)]) or '활동유형 데이터 없음'
    return {
        'generated_at': dt.datetime.now().isoformat(timespec='seconds'),
        'source': 'rules' if not os.environ.get('OPENAI_API_KEY') else 'openai_failed_fallback',
        'summary': f'총 {total}건의 경쟁사/안경원 현장 활동이 수집되었습니다. 주요 브랜드는 {top_brand}, 주요 지역은 {top_region}, 주요 활동은 {top_type}입니다.',
        'overall_interpretation': [
            f'경쟁사 크롤링 기준 주요 브랜드 집중도는 {top_brand}입니다.',
            f'지역 분포는 {top_region} 순으로 높습니다.',
            f'활동 유형은 {top_type} 중심으로 나타납니다.'
        ],
        'next_actions': [
            '경쟁사 활동이 많은 지역의 안경사 개인 Follow-up 우선순위를 높이세요.',
            '프로모션/이벤트 게시글이 많은 경우 MAX, ASD, 멀티포컬 차별화 메시지를 먼저 배포하세요.',
            '교육/세미나 활동이 많은 지역은 안경사 대상 전문성 콘텐츠로 대응하세요.'
        ],
        'weekly_report': f'이번 주/최근 수집 데이터 기준 {total}건이 확인되었습니다. {top_brand} / {top_region} / {top_type} 흐름을 우선 확인하세요.',
        'competitor_actions': [
            '상위 지역 담당자에게 경쟁사 활동 리스트를 공유하고 대응 콘텐츠 배포 여부를 확인하세요.',
            '반복 노출되는 브랜드/제품 키워드는 다음 교육 콘텐츠 주제에 반영하세요.',
            'URL 원문을 확인해 실제 안경원 행사인지 단순 정보성 글인지 1차 검수하세요.'
        ]
    }

def make_prompt(rows):
    sample = rows[:80]
    compact = [{k:r.get(k,'') for k in ['게시일','지역','브랜드','활동유형','제목','요약','검색어','블로그명']} for r in sample]
    return f'''
너는 ACUVUE Professional Education 대시보드의 분석 AI다.
아래 경쟁사/안경원 크롤링 데이터를 보고 한국어 JSON만 반환해라.
반드시 다음 키를 포함해라: summary, overall_interpretation, next_actions, weekly_report, competitor_actions.
- overall_interpretation: 전체 데이터에 대한 해석 3~5개
- next_actions: 교육팀이 실행할 액션 3~5개
- weekly_report: 경쟁사 크롤링 리스트 상단에 보여줄 주간 요약 1문단
- competitor_actions: 경쟁사 대응 액션 3개
데이터:
{json.dumps(compact, ensure_ascii=False)}
'''.strip()

def openai_report(rows):
    from openai import OpenAI
    client = OpenAI()
    model = os.environ.get('OPENAI_MODEL','gpt-4o-mini')
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {'role':'system','content':'Return strict JSON only. No markdown.'},
            {'role':'user','content':make_prompt(rows)}
        ],
        response_format={'type':'json_object'},
        temperature=0.2,
    )
    data = json.loads(resp.choices[0].message.content)
    data['generated_at'] = dt.datetime.now().isoformat(timespec='seconds')
    data['source'] = 'openai'
    return data

def main():
    OUT.mkdir(exist_ok=True)
    rows = read_rows()
    try:
        data = openai_report(rows) if os.environ.get('OPENAI_API_KEY') else rule_report(rows)
    except Exception as e:
        data = rule_report(rows)
        data['error'] = f'OpenAI call failed: {e}'
    AI_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Created {AI_PATH} source={data.get("source")}')

if __name__ == '__main__':
    main()
