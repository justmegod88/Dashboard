# Pro-dashboard V4 AI Ready

## 핵심
- API 없이 GitHub Actions로 경쟁사/안경원 게시글 크롤링
- GitHub Secret의 OpenAI API Key로 AI 리포트 자동 생성
- 대시보드가 `output/Competitor_Activity.csv`와 `output/ai_report.json` 자동 읽기
- 실시간 ChatGPT/Copilot 연결용 Render 서버 예제 포함

## GitHub Secret 설정
1. GitHub repo 접속
2. Settings
3. Secrets and variables
4. Actions
5. New repository secret
6. Name: `OPENAI_API_KEY`
7. Secret: 본인 OpenAI API Key 붙여넣기
8. Add secret

## GitHub Actions 실행
1. Actions 탭
2. Competitor Monitor + AI Report 선택
3. Run workflow
4. 성공 후 `output/Competitor_Activity.csv`, `output/ai_report.json` 생성 확인

## 실시간 GPT 연결
정적 GitHub Pages에서는 API Key를 숨길 수 없으므로 Render/Cloudflare 같은 중간 서버가 필요합니다.
`ai_realtime_server/server.py`를 Render에 배포하고, app.js의 `AI_ENDPOINT`에 Render 주소 + `/insight`를 넣으세요.

예:
const AI_ENDPOINT = "https://your-render-service.onrender.com/insight";
