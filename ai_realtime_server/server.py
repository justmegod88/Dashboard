import os
from flask import Flask, request
from flask_cors import CORS
from openai import OpenAI

app = Flask(__name__)
CORS(app)
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

@app.post("/insight")
def insight():
    data = request.get_json(force=True)
    prompt = f'''너는 콘택트렌즈 교육팀용 AI 분석가다.
아래 대시보드 데이터를 바탕으로 한국어로 답변해라.

형식:
1. 핵심 해석
2. 리스크
3. 추천 교육/액션
4. Follow-up 우선순위

데이터:
{data}
'''
    resp = client.responses.create(model=os.environ.get("OPENAI_MODEL", "gpt-4.1-mini"), input=prompt)
    return resp.output_text

@app.post("/chat")
def chat():
    data = request.get_json(force=True)
    question = data.get("question","")
    dashboard = data.get("dashboard",{})
    prompt = f'''사용자 질문: {question}

대시보드 데이터:
{dashboard}

한국어로 간결하게 답변하고, 필요하면 대상자/추천교육/이유를 bullet로 정리해라.
'''
    resp = client.responses.create(model=os.environ.get("OPENAI_MODEL", "gpt-4.1-mini"), input=prompt)
    return resp.output_text

@app.get("/")
def home():
    return "ACUVUE dashboard AI server is running."

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
