# 통합돌봄 교육용 지원계획 초안 데모

한국보건복지인재원(KOHI) AI 교육 프로그램 자문용 **교육 프로토타입**입니다.

- 목적: 담당자 교육용 가상사례 → 지원 초점 요약 / 법령 근거 / 서비스 연계 후보 / 개인별 지원계획 초안
- 범위: **교육용 초안 생성** (자격 자동확정·행정처분 아님)
- 데이터: 법제처 법령 API + 공공데이터포털 복지서비스·기관 정보를 정적 샘플로 포함
- 라이브: GitHub Pages

## Live demo

- Live: https://hosungseo.github.io/integrated-care-edu-demo/
- Repo: https://github.com/hosungseo/integrated-care-edu-demo

## Korea100 links (edu)

- Central/local service cards may show **related institution models** from [Korea100](https://hosungseo.github.io/korea100/).
- Mapping is a **small curated table** (`docs/korea100-map.json`), not full WLF coverage.
- Unmapped local programs intentionally point staff to ordinance/department checks.
- Purpose: help caseworkers write plan drafts faster with “what service” + “how the regime works”.

## What this shows

1. 가상 사례 입력 카드
2. 지원 영역 및 요약
3. 법령 근거 (법제처 API 발췌: 통합돌봄법·시행령)
4. 국가서비스 후보 (서비스 ID + 근거 문장)
5. 지역특화 후보 (시군구 사업)
6. 장기요양/시설 연계 힌트
7. 고정 템플릿 지원계획 초안 + 담당자 체크리스트

## Public data sources (verified)

| Layer | Source | Notes |
|---|---|---|
| 법령 | 법제처 국가법령정보센터 DRF API | 통합돌봄법·시행령 발췌 |
| 국가서비스 | 한국사회보장정보원 중앙부처복지서비스 | list/detail REST XML |
| 지역특화 | 한국사회보장정보원 지자체복지서비스 | `LcgvWelfarelist` / `LcgvWelfaredetailed` |
| 요양기관 | 국민건강보험공단 장기요양기관 검색 | regional search sample |
| 복지시설 | 사회복지시설정보서비스 | catalog scale sample |

> 이 데모 저장소에는 **API 인증키를 포함하지 않습니다.**

## Local run

정적 사이트입니다.

```bash
# Python
python3 -m http.server 8080 -d docs

# or open docs/index.html directly
```

## Safety / education boundaries

- 실명·주민번호 등 실제 개인정보 사용 금지
- 추천 결과는 검토 후보이며 지급/선정 확정이 아님
- 서비스 ID 없는 추천 금지 원칙
- 법령 발췌는 교육용이며 최신 조문·해석은 원문 확인
- 최종 판단은 담당자·통합지원회의

## Repo layout

```
docs/           # GitHub Pages site
  index.html
  styles.css
  app.js
  data.json
  laws.json
data/           # static sample JSON used by the demo
scripts/        # optional law refresh helper (requires LAW_OC env)
README.md
```

## Disclaimer

교육·연구·자문 목적의 프로토타입입니다. 공공데이터·법령 원문의 최신성·적격 요건은 공식 안내와 관할 기관 확인이 필요합니다.
