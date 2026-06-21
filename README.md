# Korea PCI Market Dashboard

GitHub Pages에 바로 올릴 수 있도록 정리한 정적 웹 대시보드입니다.

## 업로드 파일 구조

```text
index.html
styles.css
app.js
config.local.js
tg-data.local.js
assets/
  korea-region-reference.jpeg
```

## GitHub Pages 배포 방법

1. 새 GitHub repository 생성
2. 위 파일들을 repository root에 업로드
3. Settings > Pages 이동
4. Branch를 `main`, Folder를 `/root`로 선택
5. 저장 후 제공되는 GitHub Pages URL 접속

## 주의

- `config.local.js`에는 실제 HIRA API serviceKey를 넣지 않은 상태입니다. 공개 repo에 API key를 넣으면 외부에 노출됩니다.
- `tg-data.local.js`도 공개용으로 비워두었습니다. 내부 TG 실적 데이터는 공개 repo에 올리면 병원명/실적 정보가 노출될 수 있습니다.
- 실제 실적은 화면 우측 상단의 Excel 업로드 버튼으로 업로드해서 사용할 수 있습니다.

## API 자동연동을 테스트하려면

비공개 저장소 또는 로컬 환경에서만 `config.local.js`의 serviceKey 값을 입력하세요.
