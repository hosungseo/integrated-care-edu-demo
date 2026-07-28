#!/usr/bin/env python3
import json, os, re, sys, urllib.parse
from pathlib import Path
sys.path.insert(0, "/Users/seohoseong/projects/govfit/scripts")
from law_api import search_law, fetch_law, ensure_list, clean_item_text, article_label

def load_oc():
    oc = os.environ.get("LAW_OC") or os.environ.get("OC")
    if oc:
        return oc.strip()
    for p in [Path("/Users/seohoseong/proposal-draft/.env"), Path("/Users/seohoseong/projects/govfit/.env"), Path("/Users/seohoseong/korea100/.env")]:
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
            m = re.match(r"^(?:export\s+)?(?:LAW_OC|OC)\s*=\s*[\"\']?([^\"\']+)", line)
            if m:
                return m.group(1).strip()
    raise SystemExit("Set LAW_OC env or .env; refusing hardcoded OC in repo script")

def article_text(article):
    parts = []
    body = clean_item_text(article.get("조문내용"))
    if body:
        parts.append(body)
    for hang in ensure_list(article.get("항")):
        if isinstance(hang, dict):
            ht = clean_item_text(hang.get("항내용"))
            if ht:
                parts.append(ht)
    return re.sub(r"\s+", " ", " ".join(parts)).strip()

def collect_articles(law):
    arts = ensure_list((law.get("조문") or {}).get("조문단위") if isinstance(law.get("조문"), dict) else law.get("조문"))
    if arts:
        return [a for a in arts if isinstance(a, dict) and a.get("조문번호")]
    found = []
    def walk(o):
        if isinstance(o, dict):
            if "조문번호" in o:
                found.append(o)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(law)
    return found

def pick(articles, keywords, limit=8, default_why="통합돌봄 개인별 지원계획 교육 시 참고 조문"):
    why = {"1":"법 목적: 살던 곳에서 건강한 삶, 통합지원 체계","2":"정의: 통합지원·개인별지원계획 등 핵심 개념","11":"시군구 통합지원 총괄/계획 관련 근거","12":"개인별 지원계획 수립 근거","13":"서비스 연계·조정 관련 근거","14":"통합지원회의/협력 관련 근거","15":"서비스 제공·이용 지원 관련 근거","16":"모니터링 관련 근거","17":"정보 연계 관련 근거"}
    out = []
    for a in articles:
        no = str(a.get("조문번호") or "")
        title = clean_item_text(a.get("조문제목"))
        text = article_text(a)
        if not text:
            continue
        blob = f"{title} {text}"
        if any(k in blob for k in keywords) or no in why:
            out.append({"label": article_label(a), "articleNo": no, "title": title, "text": text[:420], "why": why.get(no, default_why)})
    seen=set(); uniq=[]
    for x in out:
        if x["label"] in seen: continue
        seen.add(x["label"]); uniq.append(x)
    pri=["1","2","11","12","13","14","15","16","17"]
    def sk(x):
        no=x["articleNo"]
        return (pri.index(no) if no in pri else 99, int(re.sub(r"\D","", no or "999") or 999))
    return sorted(uniq, key=sk)[:limit]

def main():
    oc = load_oc()
    laws, root, url = search_law(oc, "의료·요양 등 지역 돌봄의 통합지원에 관한 법률", display=20)
    if not laws:
        laws, root, url = search_law(oc, "지역 돌봄의 통합지원", display=20)
    print("laws", len(laws))
    if not laws:
        raise SystemExit("no laws")
    def score(l):
        n=l.get("법령명한글") or ""
        s=0
        if "통합지원" in n: s+=5
        if "지역 돌봄" in n or "지역돌봄" in n: s+=5
        if "의료" in n and "요양" in n: s+=3
        if l.get("법령구분명")=="법률": s+=3
        if "시행령" in n: s-=2
        return s
    main_law = sorted(laws, key=score, reverse=True)[0]
    print("MAIN", main_law.get("법령명한글"), main_law.get("법령일련번호"), main_law.get("시행일자"))
    mst = str(main_law.get("법령일련번호"))
    law, durl = fetch_law(oc, mst)
    articles = collect_articles(law)
    print("articles_raw", len(articles))
    keywords=["개인별","지원계획","서비스","연계","시·군·구","시군구","통합지원","신청","조사","모니터링","발굴","회의"]
    picked = pick(articles, keywords, limit=8)
    d_laws, _, _ = search_law(oc, "의료·요양 등 지역 돌봄의 통합지원에 관한 법률 시행령", display=10)
    if not d_laws:
        d_laws, _, _ = search_law(oc, "지역 돌봄의 통합지원에 관한 법률 시행령", display=10)
    decree_name=None; decree_picked=[]
    if d_laws:
        dmain=sorted(d_laws, key=lambda l: ("시행령" in (l.get("법령명한글") or ""), "통합지원" in (l.get("법령명한글") or "")), reverse=True)[0]
        decree_name=dmain.get("법령명한글")
        print("DECREE", decree_name, dmain.get("법령일련번호"))
        dlaw,_=fetch_law(oc, str(dmain.get("법령일련번호")))
        darts=collect_articles(dlaw)
        decree_picked=pick(darts, keywords, limit=4, default_why="시행령: 계획 수립·연계 절차 세부")
        for x in decree_picked: x["why"]="시행령: 계획 수립·연계 절차 세부"
    basic = law.get("기본정보") if isinstance(law.get("기본정보"), dict) else {}
    meta = {
        "lawName": main_law.get("법령명한글"),
        "lawId": main_law.get("법령ID") or mst,
        "mst": mst,
        "enforcementDate": main_law.get("시행일자") or basic.get("시행일자"),
        "ministry": main_law.get("소관부처명") or basic.get("소관부처명"),
        "source": "법제처 국가법령정보센터 DRF API",
        "fetchedAt": "2026-07-29",
        "link": "https://www.law.go.kr/법령/" + urllib.parse.quote(main_law.get("법령명한글") or ""),
        "note": "교육용 발췌. 최신 조문·해석은 국가법령정보센터 원문 확인 필요.",
    }
    payload = {"meta": meta, "articles": picked, "decree": {"lawName": decree_name, "articles": decree_picked}, "caseLinks": [{"caseId":"busan-elderly-home","focus":["개인별 지원계획 수립","서비스 연계·조정","재가 중심 통합지원","모니터링"],"articleLabels":[a["label"] for a in picked[:5]]}]}
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if oc in text: raise SystemExit("OC leaked")
    root = Path("/Users/seohoseong/integrated-care-edu-demo")
    (root/"docs"/"laws.json").write_text(text, encoding="utf-8")
    (root/"data"/"laws.json").write_text(text, encoding="utf-8")
    print("saved", len(picked), len(decree_picked))
    for a in picked: print("-", a["label"], a["text"][:80])
    for a in decree_picked: print("*", a["label"], a["text"][:80])

if __name__ == "__main__":
    main()
