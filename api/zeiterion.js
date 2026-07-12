import crypto from 'node:crypto';

const COOKIE_NAME = '__Host-tenx8_zeiterion';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, part) => {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) return cookies;

    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();

    if (name) {
      cookies[name] = decodeURIComponent(value);
    }

    return cookies;
  }, {});
}

function hashText(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function safeEqualText(left, right) {
  return crypto.timingSafeEqual(hashText(left), hashText(right));
}

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createSessionToken(secret) {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = String(expiresAt);
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

function verifySessionToken(token, secret) {
  if (!token || !secret) return false;

  const [payload, suppliedSignature, ...extra] = token.split('.');
  if (!payload || !suppliedSignature || extra.length) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  const expectedSignature = signPayload(payload, secret);
  return safeEqualText(suppliedSignature, expectedSignature);
}

function sessionCookie(token) {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax'
  ].join('; ');
}

function clearSessionCookie() {
  return [
    `${COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'Secure',
    'SameSite=Lax'
  ].join('; ');
}

async function readFormBody(request) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
    return request.body;
  }

  if (typeof request.body === 'string') {
    return Object.fromEntries(new URLSearchParams(request.body));
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return Object.fromEntries(new URLSearchParams(raw));
}

function setPrivateHeaders(response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Expires', '0');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Content-Security-Policy', "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'self'");
}

function sendHtml(response, statusCode, html) {
  setPrivateHeaders(response);
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(html);
}

function renderLogin(errorMessage = '') {
  const errorMarkup = errorMessage
    ? `<p class="login-error" role="alert">${escapeHtml(errorMessage)}</p>`
    : '';

  return String.raw`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow, noarchive" />
  <meta name="theme-color" content="#11120f" />
  <title>Private Briefing | 10×8 × The Zeiterion</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/zeiterion.css" />
</head>
<body class="login-body">
  <main class="login-shell">
    <section class="login-intro">
      <div>
        <div class="login-brand">
          <span class="login-brand-mark">10×8</span>
          <span class="login-brand-sub">Creative Industry Lab</span>
        </div>

        <p class="login-kicker">Private institutional briefing</p>
        <h1>Prepared for <span>The Zeiterion.</span></h1>
        <p class="login-intro-copy">
          A focused partnership proposal exploring The Zeiterion as the founding institutional home of the first 10×8 Creative Industry Lab pilot.
        </p>
      </div>

      <p class="login-meta">
        Access by invitation · Confidential working document · Proposal subject to discussion and approval
      </p>
    </section>

    <section class="login-panel">
      <div class="login-card">
        <span class="private-label">Protected access</span>
        <h2>Enter the briefing.</h2>
        <p>This page contains a direct institutional proposal, operating model, partnership responsibilities and decision path intended for invited reviewers.</p>

        <form class="login-form" method="post" action="/zeiterion" autocomplete="off">
          <label for="zeiterionPassword">Briefing password</label>
          <div class="login-input-wrap">
            <input
              id="zeiterionPassword"
              name="password"
              type="password"
              required
              autocomplete="current-password"
              autofocus
              aria-describedby="securityNote"
            />
            <button class="password-toggle" type="button" data-password-toggle aria-label="Show password" aria-pressed="false">○</button>
          </div>

          <button class="login-submit" type="submit">
            <span>Open private briefing</span>
            <span aria-hidden="true">→</span>
          </button>

          ${errorMarkup}

          <p class="login-security-note" id="securityNote">
            Authorized access lasts for 12 hours on this browser. The password is checked on the server and is not stored in the page source.
          </p>
        </form>
      </div>
    </section>
  </main>

  <script src="/zeiterion.js" defer></script>
</body>
</html>`;
}

function renderBriefing() {
  return String.raw`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow, noarchive" />
  <meta name="theme-color" content="#f3efe6" />
  <meta
    name="description"
    content="Private institutional briefing proposing The Zeiterion as the founding institutional home of the 10×8 Creative Industry Lab pilot."
  />
  <title>Private Institutional Briefing | 10×8 × The Zeiterion</title>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/zeiterion.css" />
</head>
<body class="briefing-body">
  <a class="skip-link" href="#briefing-main">Skip to briefing</a>
  <div class="briefing-progress" id="briefingProgress" aria-hidden="true"></div>

  <header class="briefing-topbar">
    <div class="briefing-topbar-inner">
      <a class="briefing-brand" href="/" aria-label="Return to the 10 by 8 public proposal">
        <span class="briefing-brand-mark">10×8</span>
        <span class="briefing-brand-sub">Creative Industry Lab</span>
      </a>

      <div class="briefing-actions">
        <span class="confidential-chip">Private institutional briefing</span>
        <button class="briefing-utility" type="button" data-print-briefing>Print briefing</button>
        <form class="briefing-logout-form" method="post" action="/zeiterion">
          <input type="hidden" name="action" value="logout" />
          <button class="briefing-logout" type="submit">Lock</button>
        </form>
      </div>
    </div>
  </header>

  <nav class="briefing-subnav" aria-label="Briefing sections">
    <div class="briefing-subnav-inner">
      <a href="#decision" class="is-active">Decision</a>
      <a href="#alignment">Why The Z</a>
      <a href="#partnership">Roles</a>
      <a href="#operations">Operations</a>
      <a href="#journey">8 weeks</a>
      <a href="#live-brief">Live brief</a>
      <a href="#funding">Funding</a>
      <a href="#guardrails">Guardrails</a>
      <a href="#timeline">Timeline</a>
      <a href="#ask">The ask</a>
    </div>
  </nav>

  <main class="briefing-main" id="briefing-main">
    <section class="briefing-hero reveal" id="decision" data-brief-section>
      <div class="hero-topline">
        <span>Confidential working proposal</span>
        <i aria-hidden="true"></i>
        <span>Prepared for The Zeiterion</span>
        <i aria-hidden="true"></i>
        <span>Pilot 01 · Graphic Design + Marketing</span>
      </div>

      <div class="hero-grid">
        <div class="hero-copy">
          <p class="brief-kicker">The institutional proposition</p>
          <h1>A gateway from creative talent to <span>creative industry.</span></h1>
          <p>
            This briefing proposes that The Zeiterion become the <strong>founding institutional home</strong> of 10×8: an eight-week paid creative-career accelerator where 10 emerging creatives train through real briefs, live campaigns, professional pressure, industry mentorship and direct opportunity pathways.
          </p>
        </div>

        <aside class="decision-card">
          <span class="decision-tag">The decision in front of us</span>
          <h2>Explore the partnership as an anchor institution.</h2>
          <p>
            The immediate request is not a blank check or a final contract. It is approval to move into structured co-development around a pilot hosted at The Z.
          </p>
          <ul>
            <li>Designate an internal liaison for the development process.</li>
            <li>Explore space, AV and operational support for the eight-week cohort.</li>
            <li>Identify one possible live Zeiterion marketing brief, subject to approval.</li>
            <li>Help shape introductions to sponsors, funders and civic partners.</li>
            <li>Work toward a short memorandum of understanding before public launch.</li>
          </ul>
        </aside>
      </div>

      <div class="hero-stat-strip" aria-label="Pilot at a glance">
        <article><strong>10</strong><span>young adult participants</span></article>
        <article><strong>8</strong><span>intensive weeks</span></article>
        <article><strong>80</strong><span>approx. contact hours</span></article>
        <article><strong>$1K</strong><span>paid to each participant</span></article>
        <article><strong>$60K</strong><span>full pilot funding target</span></article>
      </div>
    </section>

    <section class="brief-section reveal" id="alignment" data-brief-section>
      <div class="section-head">
        <div>
          <span class="brief-label">01 · Why The Zeiterion</span>
          <h2>A natural home for the next step between creative exposure and industry entry.</h2>
        </div>
        <p>
          The case for The Z is not simply about having a room. It is about institutional alignment: learning, creative expression, career readiness, community trust, public visibility and the ability to convene artists, educators, agencies, businesses, funders and civic leaders in one place.
        </p>
      </div>

      <div class="alignment-grid">
        <article class="alignment-card">
          <span class="brief-number">01</span>
          <h3>Mission alignment</h3>
          <p>The Zeiterion publicly defines itself as a gathering place where learning, connection and creative expression thrive. 10×8 extends that logic into a paid, industry-facing career accelerator.</p>
        </article>
        <article class="alignment-card">
          <span class="brief-number">02</span>
          <h3>Career-readiness continuity</h3>
          <p>The Z already operates youth programming that combines creative opportunity with arts-related career readiness. 10×8 is designed as a distinct, more intensive lane primarily for young adults moving toward professional practice.</p>
        </article>
        <article class="alignment-card">
          <span class="brief-number">03</span>
          <h3>A renewed civic platform</h3>
          <p>Following its January 2026 reopening after a major renovation, The Z has a timely opportunity to demonstrate how a renewed cultural institution can help produce the next generation of local creative professionals.</p>
        </article>
      </div>

      <p class="source-note">
        Institutional context drawn from official Zeiterion materials:
        <a href="https://www.zeiterion.org/about/mission" target="_blank" rel="noreferrer">Mission</a>,
        <a href="https://www.zeiterion.org/learn/teenambassadors" target="_blank" rel="noreferrer">Teen Ambassadors</a>, and
        <a href="https://www.zeiterion.org/renovation/reopening" target="_blank" rel="noreferrer">2026 Reopening</a>.
      </p>
    </section>

    <section class="brief-section reveal" id="partnership" data-brief-section>
      <div class="section-head">
        <div>
          <span class="brief-label">02 · Partnership architecture</span>
          <h2>Clear roles. Shared standards. No blurred expectations.</h2>
        </div>
        <p>
          The proposal is strongest when each side knows exactly what it owns. The responsibilities below are a recommended starting structure for discussion, not a final agreement.
        </p>
      </div>

      <div class="partner-grid">
        <article class="partner-column">
          <span class="partner-role">10×8 provides</span>
          <h3>The program engine.</h3>
          <p>Vision, curriculum, industry methodology, recruitment design, sponsor strategy and the professional standards that make the experience more than a class.</p>
          <ol class="partner-list">
            <li><b>01</b><span>Complete eight-week curriculum and challenge architecture for the Graphic Design + Marketing pilot.</span></li>
            <li><b>02</b><span>Founding Creative Director / Program Architect leadership and creative oversight.</span></li>
            <li><b>03</b><span>Recruitment campaign, application process, 24-hour challenge and cohort selection framework.</span></li>
            <li><b>04</b><span>Agency, sponsor, guest teacher and opportunity-partner outreach in coordination with The Z.</span></li>
            <li><b>05</b><span>Live campaign structure, portfolio development, professional pressure tests and final industry showcase design.</span></li>
            <li><b>06</b><span>Impact measurement framework and 30-, 90- and 365-day alumni tracking model.</span></li>
          </ol>
        </article>

        <article class="partner-column">
          <span class="partner-role">The Zeiterion provides</span>
          <h3>The institutional home.</h3>
          <p>Place, civic credibility, internal partnership, operational knowledge and the convening power necessary to make the pilot feel rooted in a real cultural institution.</p>
          <ol class="partner-list">
            <li><b>01</b><span>One internal liaison empowered to coordinate scheduling, operations and institutional decision-making.</span></li>
            <li><b>02</b><span>Exploration of suitable classroom/studio space, Wi-Fi, display or projection, AV and final showcase access.</span></li>
            <li><b>03</b><span>One potential live marketing or audience-development brief, selected internally and scoped appropriately.</span></li>
            <li><b>04</b><span>Participation in sponsor and funder introductions where alignment is genuine and mutually approved.</span></li>
            <li><b>05</b><span>Reasonable marketing collaboration and institutional acknowledgement, subject to brand and communications approval.</span></li>
            <li><b>06</b><span>Participation in final portfolio review, showcase and post-pilot evaluation.</span></li>
          </ol>
        </article>
      </div>

      <p class="partner-note">
        <strong>Important financial principle:</strong> this proposal does not assume The Zeiterion must provide the full $60,000 pilot budget or any specific cash contribution. The funding model is designed as a coalition of sponsors, foundations, public partners, agencies and in-kind support. Any direct financial participation by The Z would be separately discussed and documented.
      </p>
    </section>

    <section class="brief-section reveal" id="operations" data-brief-section>
      <div class="section-head">
        <div>
          <span class="brief-label">03 · Operating model</span>
          <h2>Small cohort. High intensity. Professional expectations.</h2>
        </div>
        <p>
          The pilot is intentionally limited to 10 participants so critique can be specific, accountability can be real and every person can receive meaningful access to instructors, clients and industry partners.
        </p>
      </div>

      <div class="operating-grid">
        <div class="operating-stats">
          <article><strong>10</strong><span>cohort capacity</span></article>
          <article><strong>3×</strong><span>sessions each week</span></article>
          <article><strong>80</strong><span>approx. live hours</span></article>
          <article><strong>2–4</strong><span>independent hours weekly</span></article>
        </div>

        <div>
          <div class="schedule-card">
            <div class="schedule-head">
              <span class="section-mini">Recommended weekly rhythm</span>
              <h3>Three different kinds of pressure.</h3>
            </div>
            <div class="schedule-row">
              <strong>Tuesday</strong>
              <p>Creative Studio — craft, strategy, demonstrations, critique and guided production.</p>
              <span>5:30–8:30 PM</span>
            </div>
            <div class="schedule-row">
              <strong>Thursday</strong>
              <p>Industry Lab — guest professionals, business practice, client meetings and pressure tests.</p>
              <span>5:30–8:30 PM</span>
            </div>
            <div class="schedule-row">
              <strong>Saturday</strong>
              <p>Production Lab — campaigns, content, portfolio work, rehearsal and client deliverables.</p>
              <span>11:00 AM–3:00 PM</span>
            </div>
          </div>

          <div class="venue-needs">
            <article><strong>Primary room</strong><p>Flexible studio/classroom for 12–15 people with tables and wall space.</p></article>
            <article><strong>Technology</strong><p>Reliable Wi-Fi, display or projection, power access and basic AV.</p></article>
            <article><strong>Showcase</strong><p>Access to an appropriate public-facing presentation space in Week 8.</p></article>
            <article><strong>Storage</strong><p>Secure short-term storage for limited equipment or production materials where feasible.</p></article>
            <article><strong>Accessibility</strong><p>Physical and communication access considered from recruitment through showcase.</p></article>
            <article><strong>Operations</strong><p>Agreed protocols for building access, safety, security, cleaning and after-hours use.</p></article>
          </div>
        </div>
      </div>
    </section>

    <section class="brief-section reveal" id="journey" data-brief-section>
      <div class="section-head">
        <div>
          <span class="brief-label">04 · The eight-week journey</span>
          <h2>The curriculum behaves like the industry.</h2>
        </div>
        <p>
          Each week adds a different professional demand: judgment, strategy, systems thinking, live performance data, client feedback, team accountability, business readiness and public defense of the work.
        </p>
      </div>

      <div class="week-track">
        <article class="week-card"><span class="brief-number">W01</span><h3>Talent is not a business yet.</h3><p>Baseline skills, design judgment, industry roles and the three-hour rescue challenge.</p></article>
        <article class="week-card"><span class="brief-number">W02</span><h3>Brief. Brand. Audience.</h3><p>Live client introduction, research, positioning and two opposite creative directions.</p></article>
        <article class="week-card"><span class="brief-number">W03</span><h3>Build a campaign.</h3><p>Campaign systems, hooks, copy, digital formats, accessibility and production planning.</p></article>
        <article class="week-card is-pressure"><span class="brief-number">W04</span><h3>Launch. Measure. Pivot.</h3><p>Real audience data, controlled media testing, analytics and a 24-hour change request.</p></article>
        <article class="week-card"><span class="brief-number">W05</span><h3>Welcome to agency life.</h3><p>Scope, pricing, revisions, file handoff, client email and the messy feedback meeting.</p></article>
        <article class="week-card"><span class="brief-number">W06</span><h3>Agency simulation.</h3><p>Rotating roles, leadership, conflict, delegation and an unexpected role switch.</p></article>
        <article class="week-card"><span class="brief-number">W07</span><h3>The business of creative work.</h3><p>Portfolio, proposals, rates, invoicing, interviews, negotiation and a 90-day plan.</p></article>
        <article class="week-card is-pressure"><span class="brief-number">W08</span><h3>The room.</h3><p>Final industry presentation, live Q&A, portfolio review and opportunity matching.</p></article>
      </div>
    </section>

    <section class="brief-section reveal" id="live-brief" data-brief-section>
      <div class="live-brief-shell">
        <div class="live-brief-statement">
          <span class="brief-label">05 · The Z as a possible first client</span>
          <blockquote>
            The difference between a class project and a career signal is <span>real consequence.</span>
          </blockquote>
        </div>

        <div>
          <div class="brief-steps">
            <article class="brief-step">
              <span class="brief-number">01</span>
              <div><h3>The Z identifies a legitimate need.</h3><p>A real but carefully scoped marketing, audience-development, youth-program, event or community-engagement challenge is selected internally.</p></div>
            </article>
            <article class="brief-step">
              <span class="brief-number">02</span>
              <div><h3>Participants meet the actual stakeholder.</h3><p>The client explains the objective, audience, constraints and context. Students ask questions directly rather than receiving a fictional assignment.</p></div>
            </article>
            <article class="brief-step">
              <span class="brief-number">03</span>
              <div><h3>Work is reviewed at professional checkpoints.</h3><p>At least two structured touchpoints are recommended: briefing or mid-review, followed by final client response.</p></div>
            </article>
            <article class="brief-step">
              <span class="brief-number">04</span>
              <div><h3>Selected work may go live.</h3><p>Subject to institutional approval, production readiness and clear permissions, one campaign or portion of a campaign can reach the public and generate live performance data.</p></div>
            </article>
          </div>

          <div class="live-brief-guardrail">
            <strong>No unpaid speculative extraction.</strong>
            <p>Student participation in a live brief is educational and portfolio-based. Commercial or institutional use of student work beyond the agreed program scope should be documented with appropriate permissions, credit and—when the use exceeds the educational brief—additional compensation where appropriate.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="brief-section funding-section reveal" id="funding" data-brief-section>
      <div class="funding-inner">
        <div class="section-head">
          <div>
            <span class="brief-label">06 · Funding architecture</span>
            <h2>The Z anchors the table. The coalition funds the pilot.</h2>
          </div>
          <p>
            The $60,000 operating target is designed to be assembled across corporate, philanthropic, public, agency and in-kind partners rather than relying on one institution to carry the entire program.
          </p>
        </div>

        <div class="funding-hero-grid">
          <div class="funding-total">
            <span>Full pilot operating target</span>
            <strong>$60K</strong>
          </div>

          <article class="funding-role-card">
            <span class="brief-label">Recommended institutional role</span>
            <h3>Credibility. Place. Introductions. Participation.</h3>
            <p class="funding-role-copy">The Zeiterion's highest-value role is not necessarily writing the largest check. It is helping make the pilot institutionally credible, operationally possible and visible to aligned partners who can fund and expand opportunity.</p>
            <ul>
              <li>Host or explore in-kind space and AV support.</li>
              <li>Join selected sponsor or foundation conversations where useful.</li>
              <li>Allow approved partnership language once terms are formalized.</li>
              <li>Help identify aligned civic, philanthropic and business relationships.</li>
              <li>Participate in the showcase and impact review.</li>
            </ul>
          </article>
        </div>

        <div class="funding-stack" aria-label="Illustrative funding stack">
          <article><strong>$20K</strong><span>1 presenting partner</span></article>
          <article><strong>$20K</strong><span>2 challenge partners at $10K</span></article>
          <article><strong>$10K</strong><span>2 studio partners at $5K</span></article>
          <article><strong>$10K</strong><span>public or foundation support</span></article>
        </div>
      </div>
    </section>

    <section class="brief-section reveal" id="guardrails" data-brief-section>
      <div class="section-head">
        <div>
          <span class="brief-label">07 · Governance and guardrails</span>
          <h2>Opportunity without exploitation. Pressure without humiliation.</h2>
        </div>
        <p>
          Because the program is designed to feel like real industry, the boundaries must also be real. These protections should be written into the operating agreement and participant materials before recruitment begins.
        </p>
      </div>

      <div class="guardrail-grid">
        <article class="guardrail-card"><span class="brief-number">01</span><h3>Admissions independence</h3><p>Sponsors do not control selection. Applicants are evaluated through a transparent potential, work ethic, curiosity, adaptability and professionalism framework.</p></article>
        <article class="guardrail-card"><span class="brief-number">02</span><h3>Paid participation</h3><p>The full $10,000 stipend pool is secured before launch. Creative taste alone never determines whether a participant receives their earned milestone payment.</p></article>
        <article class="guardrail-card"><span class="brief-number">03</span><h3>Student work rights</h3><p>Portfolio rights, institutional usage, client usage, credit and any expanded commercial use are defined clearly and in writing.</p></article>
        <article class="guardrail-card"><span class="brief-number">04</span><h3>Consent and privacy</h3><p>Photography, video, public storytelling and personal data use require clear consent choices and reasonable alternatives.</p></article>
        <article class="guardrail-card"><span class="brief-number">05</span><h3>Accessible participation</h3><p>Transportation, meals, scheduling, disability access and technology barriers are treated as program design issues—not participant failures.</p></article>
        <article class="guardrail-card"><span class="brief-number">06</span><h3>No false promises</h3><p>The program guarantees opportunity touchpoints, not jobs. Paid work, interviews, mentorship, referrals and job shadows must be accurately described.</p></article>
      </div>
    </section>

    <section class="brief-section reveal" id="timeline" data-brief-section>
      <div class="section-head">
        <div>
          <span class="brief-label">08 · Development path</span>
          <h2>Build the opportunity infrastructure before recruiting the cohort.</h2>
        </div>
        <p>
          The program should not rush to announce student applications. The first job is to secure funding, partners, a live brief and actual opportunity commitments so the promise is real before the first participant enters the room.
        </p>
      </div>

      <div class="timeline-list">
        <article class="timeline-item">
          <span class="timeline-phase">Phase 0</span>
          <div><h3>Institutional alignment</h3><p>Confirm internal liaison, preliminary space feasibility, partnership boundaries, live-brief possibilities and the path toward an MOU.</p></div>
          <span class="timeline-window">First 30 days</span>
        </article>
        <article class="timeline-item">
          <span class="timeline-phase">Phase 1</span>
          <div><h3>Funding and opportunity coalition</h3><p>Secure stipends, sponsor commitments, agency partners, guest faculty, opportunity fund and client participation.</p></div>
          <span class="timeline-window">Approx. 60–90 days</span>
        </article>
        <article class="timeline-item">
          <span class="timeline-phase">Phase 2</span>
          <div><h3>Recruitment and selection</h3><p>Launch applications, run the 24-hour challenge, interview finalists, select 10 participants and complete orientation.</p></div>
          <span class="timeline-window">Approx. 4–6 weeks</span>
        </article>
        <article class="timeline-item">
          <span class="timeline-phase">Phase 3</span>
          <div><h3>Run the pilot</h3><p>Deliver the eight-week cohort, live campaign, guest experiences, agency simulation, portfolio work and final showcase.</p></div>
          <span class="timeline-window">8 weeks</span>
        </article>
        <article class="timeline-item">
          <span class="timeline-phase">Phase 4</span>
          <div><h3>Track what happens next</h3><p>Publish outcome updates, document work and opportunity touchpoints, follow participant progress and decide whether to repeat or expand.</p></div>
          <span class="timeline-window">30 / 90 / 365 days</span>
        </article>
      </div>

      <div class="launch-gate">
        <span class="callout-label">Non-negotiable launch gate</span>
        <h3>No empty promise of access.</h3>
        <p>Student recruitment should not open until the $10,000 stipend pool is fully committed, at least one live client brief is confirmed, at least two industry partners are active, at least six guest professionals are identified and a minimum $5,000 paid opportunity fund—or equivalent committed opportunity structure—is in place.</p>
      </div>
    </section>

    <section class="brief-section ask-section reveal" id="ask" data-brief-section>
      <div class="ask-inner">
        <div class="ask-grid">
          <div class="ask-intro">
            <span class="brief-label">09 · The exact ask</span>
            <h2>Five decisions move this forward.</h2>
            <p>
              The next step is a focused development agreement—not a public launch. The goal is to determine whether The Z and 10×8 should formally build the pilot together.
            </p>
          </div>

          <div class="ask-list">
            <article class="ask-item">
              <span class="brief-number">01</span>
              <div><h3>Agree to explore The Z as the founding institutional home.</h3><p>Authorize a structured co-development conversation around the pilot and its institutional fit.</p></div>
            </article>
            <article class="ask-item">
              <span class="brief-number">02</span>
              <div><h3>Assign one internal liaison.</h3><p>Identify a staff lead who can coordinate space, programming, marketing, operations and executive decisions as needed.</p></div>
            </article>
            <article class="ask-item">
              <span class="brief-number">03</span>
              <div><h3>Confirm preliminary space and support feasibility.</h3><p>Identify possible room windows, AV capabilities, showcase options and what could reasonably be provided in kind.</p></div>
            </article>
            <article class="ask-item">
              <span class="brief-number">04</span>
              <div><h3>Identify one possible live Zeiterion brief.</h3><p>Select a legitimate problem worth exploring with the cohort, subject to scope, timing, brand approval and staff capacity.</p></div>
            </article>
            <article class="ask-item">
              <span class="brief-number">05</span>
              <div><h3>Schedule a 60-minute working session.</h3><p>Use one focused meeting to test the operating model, clarify boundaries, shape the MOU path and identify the first sponsor/funder outreach targets.</p></div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="brief-section reveal" id="next-meeting" data-brief-section>
      <div class="section-head">
        <div>
          <span class="brief-label">10 · The next room</span>
          <h2>One working session can turn the proposal into a pilot plan.</h2>
        </div>
        <p>
          The next conversation should be operational, candid and specific. The objective is to leave with either a clear path to co-development or a clear understanding of what must change.
        </p>
      </div>

      <div class="next-meeting-grid">
        <aside class="meeting-time-card">
          <strong>60</strong>
          <span>minutes · recommended working session</span>
        </aside>

        <ol class="agenda-list">
          <li><span>00–10</span><strong>Institutional fit:</strong>&nbsp; Where 10×8 complements The Z's existing work and where it must remain distinct.</li>
          <li><span>10–20</span><strong>Space and operations:</strong>&nbsp; Schedule, rooms, AV, access, staffing, security and showcase feasibility.</li>
          <li><span>20–30</span><strong>Live brief:</strong>&nbsp; What kind of real Zeiterion challenge could be appropriate for the pilot.</li>
          <li><span>30–40</span><strong>Funding:</strong>&nbsp; Sponsor strategy, foundation fit, public partners and what institutional support is realistic.</li>
          <li><span>40–50</span><strong>Roles and guardrails:</strong>&nbsp; Ownership, approvals, student protections, brand use and decision-making.</li>
          <li><span>50–60</span><strong>Decision path:</strong>&nbsp; Internal liaison, next documents, target dates and go/no-go criteria.</li>
        </ol>
      </div>

      <div class="closing-statement">
        <p>
          The opportunity is not to tell 10 young creatives they have potential. It is to build the <span>place, standards, paid experience, relationships and doors</span> that let them prove what they can do next.
        </p>
        <div class="closing-actions">
          <a href="mailto:caliph.safe@gmail.com?subject=10%C3%978%20%C3%97%20The%20Zeiterion%20Working%20Session">Start the working session <span aria-hidden="true">→</span></a>
          <button type="button" data-print-briefing>Print this briefing</button>
        </div>
      </div>
    </section>
  </main>

  <footer class="briefing-footer">
    <div class="briefing-footer-inner">
      <div class="footer-brand">10×8 · Creative Industry Lab</div>
      <p class="footer-copy">
        Confidential working proposal prepared for discussion with The Zeiterion. All partnership language, institutional responsibilities, program naming, dates, space commitments, funding participation and public communications remain subject to formal review and approval.
      </p>
    </div>
  </footer>

  <script src="/zeiterion.js" defer></script>
</body>
</html>`;
}

export default async function handler(request, response) {
  setPrivateHeaders(response);

  const configuredPassword = process.env.ZEITERION_PASSWORD;
  const sessionSecret = process.env.ZEITERION_SESSION_SECRET;

  if (!configuredPassword || !sessionSecret) {
    sendHtml(
      response,
      503,
      renderLogin('Private access has not been configured yet. Add ZEITERION_PASSWORD and ZEITERION_SESSION_SECRET in Vercel, then redeploy.')
    );
    return;
  }

  if (request.method === 'POST') {
    const body = await readFormBody(request);

    if (body.action === 'logout') {
      response.setHeader('Set-Cookie', clearSessionCookie());
      response.statusCode = 303;
      response.setHeader('Location', '/zeiterion');
      response.end();
      return;
    }

    const suppliedPassword = String(body.password || '');

    if (!suppliedPassword || !safeEqualText(suppliedPassword, configuredPassword)) {
      sendHtml(response, 401, renderLogin('That password did not match. Please check it and try again.'));
      return;
    }

    const token = createSessionToken(sessionSecret);
    response.setHeader('Set-Cookie', sessionCookie(token));
    response.statusCode = 303;
    response.setHeader('Location', '/zeiterion');
    response.end();
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD, POST');
    response.statusCode = 405;
    response.end('Method Not Allowed');
    return;
  }

  const cookies = parseCookies(request.headers.cookie || '');
  const isAuthorized = verifySessionToken(cookies[COOKIE_NAME], sessionSecret);

  if (!isAuthorized) {
    sendHtml(response, 200, renderLogin());
    return;
  }

  sendHtml(response, 200, renderBriefing());
}
