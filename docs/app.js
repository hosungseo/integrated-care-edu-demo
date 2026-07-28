const state = { data: null, laws: null, caseId: null, generated: false };

const $ = (id) => document.getElementById(id);

function flagClass(flag) {
  if (!flag) return "flag";
  if (flag.includes("확인") || flag.includes("전제")) return "flag warn";
  if (flag.includes("특화") || flag.includes("후보") || flag.includes("근거")) return "flag ok";
  return "flag";
}

function setEmpty(el, text) {
  el.innerHTML = `<div class="empty">${text}</div>`;
}

function renderCase(c) {
  const p = c.profile;
  $("caseCard").innerHTML = `
    <div class="case-title">${c.label}</div>
    <div class="case-summary">${c.summary}</div>
    <dl class="kv">
      <dt>대상</dt><dd>${c.name} · ${p.ageBand} · ${p.sex} · ${p.household}</dd>
      <dt>지역</dt><dd>${p.region}</dd>
      <dt>주거/소득</dt><dd>${p.housing} / ${p.income}</dd>
      <dt>건강/돌봄</dt><dd>${p.health} / ${p.care}</dd>
      <dt>일상/안전</dt><dd>${p.daily} / ${p.safety}</dd>
      <dt>희망</dt><dd>${p.preference}</dd>
    </dl>
  `;
}

function renderNeeds(c) {
  $("needTags").innerHTML = c.needTags.map((t) => `<span class="chip">${t}</span>`).join("");
  $("needSummary").textContent = c.needSummary;
  $("needSummary").classList.remove("muted");
}

function renderLaws(caseId) {
  const laws = state.laws;
  if (!laws) {
    setEmpty($("lawList"), "법령 데이터를 불러오지 못했습니다.");
    return;
  }
  const meta = laws.meta || {};
  const link = $("lawLink");
  if (meta.link) {
    link.href = meta.link;
    link.style.display = "";
  } else {
    link.style.display = "none";
  }
  const when = meta.enforcementDateDisplay || meta.enforcementDate || "-";
  $("lawMeta").innerHTML = `<b>${meta.lawName || "법령"}</b> · 시행 ${when} · ${meta.ministry || ""} · ${meta.source || "법제처"}`;

  const caseLink = (laws.caseLinks || []).find((x) => x.caseId === caseId) || (laws.caseLinks || [])[0];
  const focus = (caseLink && caseLink.focus) || [];
  $("lawFocus").innerHTML = focus.map((t) => `<span class="chip">${t}</span>`).join("");

  const preferred = new Set((caseLink && caseLink.articleLabels) || []);
  const articles = (laws.articles || []).slice().sort((a, b) => {
    const ap = preferred.has(a.label) ? 0 : 1;
    const bp = preferred.has(b.label) ? 0 : 1;
    return ap - bp;
  });

  $("lawList").innerHTML = articles.map((item) => `
    <article class="item law-item">
      <div class="item-top">
        <div>
          <h3>${item.label}</h3>
          <div class="id">법률 · 조문 발췌</div>
        </div>
        <span class="flag ok">${item.why || "법령 근거"}</span>
      </div>
      <p class="evidence">${item.text}</p>
    </article>
  `).join("");

  const decree = laws.decree || {};
  const darts = decree.articles || [];
  if (!darts.length) {
    $("decreeBox").innerHTML = "";
    return;
  }
  $("decreeBox").innerHTML = `
    <div class="decree-head">시행령 보충 · ${decree.lawName || ""}</div>
    <div class="stack">
      ${darts.map((item) => `
        <article class="item law-item compact">
          <div class="item-top">
            <div>
              <h3>${item.label}</h3>
              <div class="id">시행령</div>
            </div>
            <span class="flag">${item.why || "시행령"}</span>
          </div>
          <p class="evidence">${item.text}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderNational(list) {
  $("nationalList").innerHTML = list.map((item) => `
    <article class="item">
      <div class="item-top">
        <div>
          <h3>${item.priority}. ${item.servNm}</h3>
          <div class="id">${item.servId}</div>
        </div>
        <span class="${flagClass(item.flag)}">${item.flag}</span>
      </div>
      <p class="why">${item.why}</p>
      <p class="evidence">${item.evidence}</p>
    </article>
  `).join("");
}

function renderLocal(list) {
  $("localList").innerHTML = list.map((item) => `
    <article class="item">
      <div class="item-top">
        <div>
          <h3>${item.priority}. ${item.servNm}</h3>
          <div class="id">${item.servId} · ${item.region}</div>
        </div>
        <span class="${flagClass(item.flag)}">${item.flag}</span>
      </div>
      <p class="why">${item.why}</p>
      <p class="evidence"><b>대상</b> ${item.target}<br/><b>지원</b> ${item.benefit}<br/><b>신청</b> ${item.apply}<br/><b>담당</b> ${item.dept}</p>
    </article>
  `).join("");
}

function renderProviders(c) {
  $("providerNote").textContent = c.providers.ltcNote;
  $("providerList").innerHTML = c.providers.ltc
    .map((x) => `<li><b>${x.name}</b> <span class="id">(${x.code})</span></li>`)
    .join("");
  $("facilityNote").textContent = c.providers.facilityNote;
}

function renderPlan(c) {
  const plan = c.plan;
  const lawBits = ((state.laws && state.laws.articles) || [])
    .filter((a) => ["12", "13", "14"].includes(String(a.articleNo)))
    .map((a) => a.label);
  $("planBox").innerHTML = `
    <div class="plan-block">
      <h3>목표</h3>
      <ul>${plan.goals.map((x) => `<li>${x}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h3>우선 개입</h3>
      <ul>${plan.actions.map((x) => `<li>${x}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h3>서비스 연계표</h3>
      <table class="matrix">
        <thead><tr><th>지원 영역</th><th>후보</th></tr></thead>
        <tbody>
          ${plan.matrix.map((x) => `<tr><td>${x.need}</td><td>${x.candidate}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
    <div class="plan-block">
      <h3>법령 근거(계획 수립 시)</h3>
      <ul>${(lawBits.length ? lawBits : ["개인별지원계획·종합판정·제공 조문"]).map((x) => `<li>${x}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h3>담당자 체크리스트</h3>
      <ul>${plan.checklist.map((x) => `<li>${x}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h3>유의사항 / 코칭</h3>
      <ul>${plan.coaching.map((x) => `<li>${x}</li>`).join("")}</ul>
    </div>
  `;
}

function generate() {
  const c = state.data.cases.find((x) => x.id === state.caseId);
  if (!c) return;
  state.generated = true;
  renderNeeds(c);
  renderLaws(state.caseId);
  renderNational(c.national);
  renderLocal(c.local);
  renderProviders(c);
  renderPlan(c);
  $("runBtn").textContent = "초안 다시 생성";
}

function initMeta(data) {
  $("title").textContent = data.meta.title;
  $("subtitle").textContent = data.meta.subtitle;
  $("asOf").textContent = `as of ${data.meta.asOf}`;
  $("disclaimer").textContent = data.meta.disclaimer;
  const s = data.meta.catalogScale;
  $("stats").innerHTML = `
    <div class="stat"><b>${s.nationalServices.toLocaleString()}</b><span>국가서비스</span></div>
    <div class="stat"><b>${s.localServices.toLocaleString()}</b><span>지자체서비스</span></div>
    <div class="stat"><b>${s.welfareFacilities.toLocaleString()}</b><span>복지시설</span></div>
    <div class="stat"><b>법령</b><span>법제처 연결</span></div>
  `;
  $("sources").innerHTML = data.meta.sources.map((x) => `<li>${x}</li>`).join("");
  $("caseSelect").innerHTML = data.cases
    .map((c) => `<option value="${c.id}">${c.label}</option>`)
    .join("");
}

async function boot() {
  setEmpty($("nationalList"), "생성 전");
  setEmpty($("localList"), "생성 전");
  setEmpty($("lawList"), "생성 버튼을 누르면 법제처 기반 조문 근거가 표시됩니다.");
  setEmpty($("planBox"), "생성 버튼을 누르면 고정 템플릿 초안이 채워집니다.");
  $("providerNote").textContent = "생성 전";
  $("providerList").innerHTML = "";
  $("facilityNote").textContent = "";
  $("lawMeta").textContent = "생성 전";
  $("lawFocus").innerHTML = "";
  $("decreeBox").innerHTML = "";

  const [dataRes, lawRes] = await Promise.all([
    fetch("./data.json", { cache: "no-store" }),
    fetch("./laws.json", { cache: "no-store" }),
  ]);
  const data = await dataRes.json();
  state.laws = await lawRes.json();
  state.data = data;
  state.caseId = data.cases[0].id;
  initMeta(data);
  renderCase(data.cases[0]);

  // show law meta even before generate
  if (state.laws && state.laws.meta) {
    const meta = state.laws.meta;
    $("lawMeta").innerHTML = `<b>${meta.lawName || "법령"}</b> · 시행 ${meta.enforcementDateDisplay || meta.enforcementDate || "-"} · ${meta.ministry || ""} · 생성 시 관련 조문 표시`;
    if (meta.link) {
      $("lawLink").href = meta.link;
    }
  }

  $("caseSelect").addEventListener("change", (e) => {
    state.caseId = e.target.value;
    const c = data.cases.find((x) => x.id === state.caseId);
    renderCase(c);
    if (state.generated) generate();
  });
  $("runBtn").addEventListener("click", generate);
}

boot().catch((err) => {
  console.error(err);
  $("needSummary").textContent = "데이터를 불러오지 못했습니다.";
});
