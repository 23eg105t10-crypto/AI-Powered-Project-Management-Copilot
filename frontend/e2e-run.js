import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://localhost:5175';
const outDir = 'test-results';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function main(){
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push({type: msg.type(), text: msg.text()}));
  page.on('pageerror', err => consoleLogs.push({type: 'pageerror', text: String(err)}));

  // stub clipboard
  await context.addInitScript(() => {
    window.__lastClipboard = null;
    navigator.clipboard = { writeText: (t) => { window.__lastClipboard = t; return Promise.resolve(); } };
  });

  // route mocks for backend endpoints
  await page.route('**/api/auth/signup', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ token: 'mock-token-admin', user: { name: 'E2E Admin', email: 'e2e+admin@test.com', role: 'Admin' } })
  }));
  await page.route('**/api/auth/login', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ token: 'mock-token-admin', user: { name: 'E2E Admin', email: 'e2e+admin@test.com', role: 'Admin' } })
  }));
  await page.route('**/api/auth/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: { name: 'E2E Admin', email: 'e2e+admin@test.com', role: 'Admin' } })
  }));

  const fakeAnalysis = {
    summary: 'This is a mocked executive summary from E2E test.',
    milestones: ['M1: Setup','M2: MVP','M3: Launch'],
    risks: [{name:'Data Loss',severity:'High',mitigation:'Backups'},{name:'Late API',severity:'Medium',mitigation:'Stubs'}],
    projects: [{id:1,title:'E2E Project'}],
    completion: '10%',
    cost: 2.34,
    velocity: '12 pts',
    riskSeverity: 'Medium',
    aiRequests: 5,
    activity: ['Agent created tasks','Agent flagged risk'],
    chartData: [{name:'Mon',val:10},{name:'Tue',val:20}],
    score: 58
  };

  await page.route('**/api/projects/analyze', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(fakeAnalysis)
  }));

  await page.route('**/api/admin/users', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{name:'E2E Admin', email:'e2e+admin@test.com', role:'Admin'}])
  }));

  // Start test flow
  console.log('Opening app at', BASE);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${outDir}/landing.png`, fullPage: true });

  // Navigate to login and sign up
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  try{
    await page.waitForSelector('button:has-text("Create an account")', { timeout: 60000 });
    await page.click('button:has-text("Create an account")');
  }catch(e){
    console.error('Could not find signup button — saving page HTML for debugging.');
    const html = await page.content();
    fs.writeFileSync(`${outDir}/login_page.html`, html);
    throw e;
  }
  await page.fill('input[placeholder="Full name"]', 'E2E Admin');
  await page.selectOption('select', 'Admin');
  await page.fill('input[placeholder="Email"]', 'e2e+admin@test.com');
  await page.fill('input[placeholder="Password"]', 'Admin123!');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button:has-text("Sign In")')
  ]);
  await page.screenshot({ path: `${outDir}/after-signup.png`, fullPage: true });

  // Verify localStorage persisted
  const token = await page.evaluate(()=>localStorage.getItem('token'));
  const user = await page.evaluate(()=>JSON.parse(localStorage.getItem('user')||'null'));
  fs.writeFileSync(`${outDir}/storage_after_signup.json`, JSON.stringify({token,user},null,2));

  // Refresh and confirm persistence
  await page.reload({ waitUntil: 'domcontentloaded' });
  const token2 = await page.evaluate(()=>localStorage.getItem('token'));

  // Logout
  await page.click('button:has-text("Logout")');
  await page.waitForURL('**/login');
  await page.screenshot({ path: `${outDir}/after-logout.png`, fullPage: true });

  // Login again
  await page.fill('input[placeholder="Email"]', 'e2e+admin@test.com');
  await page.fill('input[placeholder="Password"]', 'Admin123!');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button:has-text("Sign In")')
  ]);
  await page.screenshot({ path: `${outDir}/after-login.png`, fullPage: true });

  // Go to workspace
  await page.goto(BASE + '/workspace');
  await page.fill('textarea[placeholder^="Describe client goals"]', 'Client needs a secure project management portal with dashboards, tasks, milestones, weekly reports, email updates, role-based access, and deployment-ready documentation.');
  await page.fill('label:has-text("Project Name") input', 'E2E Project');
  await page.fill('label:has-text("Team Size") input', '6');
  await page.fill('label:has-text("Budget") input', '100000');
  await page.fill('input[type="date"]', '2026-12-31');
  await page.fill('label:has-text("Preferred Tech Stack") input', 'React, Node');
  await page.fill('label:has-text("Sprint Duration") input', '2');
  await page.fill('label:has-text("Security Requirements") input', 'OWASP');
  await page.selectOption('label:has-text("Deployment Preference") select', 'AWS');
  await page.selectOption('label:has-text("Client Priority") select', 'High');
  await page.selectOption('label:has-text("Risk Tolerance") select', 'Medium');
  await page.fill('label:has-text("Compliance Requirements") input', 'SOC2');
  await page.fill('label:has-text("Integrations Required") input', 'Stripe, Slack');

  // Run analysis
  const [analyzeResp] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/api/projects/analyze') && r.status() === 200),
    page.click('button:has-text("Run AI Intake")')
  ]);
  const analyzeJson = await analyzeResp.json();
  fs.writeFileSync(`${outDir}/analyze_response.json`, JSON.stringify(analyzeJson,null,2));
  await page.screenshot({ path: `${outDir}/workspace_after_analyze.png`, fullPage: true });

  // Verify localStorage latest_ai_result and admin_logs
  const latest = await page.evaluate(()=>JSON.parse(localStorage.getItem('latest_ai_result')||'null'));
  const logs = await page.evaluate(()=>JSON.parse(localStorage.getItem('admin_logs')||'[]'));
  fs.writeFileSync(`${outDir}/storage_after_analyze.json`, JSON.stringify({latest,logs},null,2));

  // Dashboard
  await page.goto(BASE + '/dashboard');
  await page.screenshot({ path: `${outDir}/dashboard.png`, fullPage: true });

  // Reports
  await page.goto(BASE + '/reports');
  await page.screenshot({ path: `${outDir}/reports.png`, fullPage: true });
  // Test copy
  await page.click('button:has-text("Copy Report")');
  const clipboard = await page.evaluate(()=>window.__lastClipboard || navigator.clipboard && window.__lastClipboard);
  fs.writeFileSync(`${outDir}/clipboard.txt`, clipboard || '');
  // Test PDF download by clicking
  await page.click('button:has-text("Download PDF")');

  // Admin
  await page.goto(BASE + '/admin');
  await page.screenshot({ path: `${outDir}/admin.png`, fullPage: true });

  // Workflow page
  await page.goto(BASE + '/workflow');
  await page.screenshot({ path: `${outDir}/workflow_before.png`, fullPage: true });
  // start workflow
  await page.click('button:has-text("Run Multi-Agent Workflow")');
  // wait for a short while and capture
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${outDir}/workflow_running.png`, fullPage: true });

  // Save console logs
  fs.writeFileSync(`${outDir}/console.json`, JSON.stringify(consoleLogs,null,2));

  await browser.close();
  console.log('E2E complete — artifacts in', outDir);
}

main().catch(e=>{ console.error(e); process.exit(1); });
