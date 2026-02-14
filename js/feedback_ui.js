/**
 * BEATRIX Feedback Governance System — Frontend v1.2
 * Added: AI Solution Generator
 */

const FEEDBACK_STATUS = {
    neu: { label: 'Neu', color: '#6B7280', icon: '📥' },
    triaged: { label: 'Triaged', color: '#3B82F6', icon: '🔍' },
    waiting_user: { label: 'Warte auf User', color: '#F59E0B', icon: '👤' },
    waiting_admin: { label: 'Warte auf Admin', color: '#F59E0B', icon: '⏳' },
    in_arbeit: { label: 'In Arbeit', color: '#8B5CF6', icon: '🔧' },
    geloest: { label: 'Gelöst', color: '#10B981', icon: '✅' },
    abgelehnt: { label: 'Abgelehnt', color: '#EF4444', icon: '❌' },
};

const FEEDBACK_TIERS = {
    1: { label: 'Auto', color: '#10B981' },
    2: { label: 'User', color: '#F59E0B' },
    3: { label: 'Admin', color: '#3B82F6' },
    4: { label: 'Owner', color: '#EF4444' },
};

const API_BASE = window.API_BASE || 'https://bea-lab-upload-production.up.railway.app';

// ═══════════════════════════════════════════════════════════════
// FEEDBACK WIDGET (Floating Button)
// ═══════════════════════════════════════════════════════════════

class FeedbackWidget {
    constructor() {
        this.createWidget();
    }

    createWidget() {
        const fab = document.createElement('button');
        fab.id = 'feedbackFab';
        fab.style.cssText = `position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; 
            border-radius: 50%; background: linear-gradient(135deg, #1B365D, #2E4A7D); color: white; 
            border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(27,54,93,0.4); 
            font-size: 24px; z-index: 9998; transition: transform 0.2s;`;
        fab.innerHTML = '💬';
        fab.title = 'Feedback geben (Ctrl+Shift+F)';
        fab.onmouseover = () => fab.style.transform = 'scale(1.1)';
        fab.onmouseout = () => fab.style.transform = 'scale(1)';
        fab.onclick = () => this.openModal();
        document.body.appendChild(fab);

        const modal = document.createElement('div');
        modal.id = 'feedbackModal';
        modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
            background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: none; 
            justify-content: center; align-items: center; z-index: 9999;`;
        modal.innerHTML = `
            <div style="background: #1a1f2e; border-radius: 16px; width: 90%; max-width: 450px; 
                padding: 24px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                    <h3 style="margin: 0; color: white;">💬 Feedback geben</h3>
                    <button onclick="feedbackWidget.closeModal()" style="background: none; border: none; color: #9CA3AF; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <textarea id="feedbackMessage" placeholder="Beschreibe dein Anliegen, Bug oder Verbesserung..." 
                    style="width: 100%; min-height: 120px; padding: 12px; border-radius: 8px; 
                    border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); 
                    color: white; font-size: 14px; resize: vertical; margin-bottom: 16px; box-sizing: border-box;"></textarea>
                <button onclick="feedbackWidget.submit()" 
                    style="width: 100%; padding: 14px; border-radius: 8px; border: none; 
                    background: linear-gradient(135deg, rgb(251,191,36) 0%, rgb(245,158,11) 100%); 
                    color: #1B365D; font-weight: 600; font-size: 16px; cursor: pointer;">
                    Feedback senden
                </button>
            </div>
        `;
        modal.onclick = (e) => { if (e.target === modal) this.closeModal(); };
        document.body.appendChild(modal);

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.openModal();
            }
        });
    }

    openModal() { document.getElementById('feedbackModal').style.display = 'flex'; }
    closeModal() { document.getElementById('feedbackModal').style.display = 'none'; }

    async submit() {
        const msg = document.getElementById('feedbackMessage').value.trim();
        if (!msg) { alert('Bitte Nachricht eingeben'); return; }

        try {
            const token = sessionStorage.getItem('bea_token');
            const resp = await fetch(`${API_BASE}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    message: msg,
                    tab_context: window.location.hash.replace('#', '') || 'dashboard',
                    screen_size: `${window.innerWidth}x${window.innerHeight}`,
                    page_url: window.location.href
                })
            });

            if (resp.ok) {
                document.getElementById('feedbackMessage').value = '';
                this.closeModal();
                alert('✅ Danke für dein Feedback!');
            } else {
                const err = await resp.json();
                alert('Fehler: ' + (err.detail || 'Unbekannt'));
            }
        } catch (e) {
            alert('Netzwerkfehler: ' + e.message);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════

class FeedbackAdminDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.feedbacks = [];
        this.currentSolution = null;
        this.init();
    }

    async init() {
        this.render();
        await this.loadFeedbacks();
    }

    render() {
        this.container.innerHTML = `
            <div style="margin-top: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <span style="color: #9CA3AF;">Neue Feedback-Tabelle (Governance System)</span>
                    <button onclick="feedbackAdmin.loadFeedbacks()" style="padding: 8px 16px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: white; cursor: pointer;">🔄 Aktualisieren</button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
                    <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; text-align: center;">
                        <div id="statTotal" style="font-size: 28px; font-weight: 700; color: white;">-</div>
                        <div style="color: #6B7280; font-size: 13px;">Gesamt</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; text-align: center;">
                        <div id="statNeu" style="font-size: 28px; font-weight: 700; color: #F59E0B;">-</div>
                        <div style="color: #6B7280; font-size: 13px;">Neu</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; text-align: center;">
                        <div id="statWaiting" style="font-size: 28px; font-weight: 700; color: #3B82F6;">-</div>
                        <div style="color: #6B7280; font-size: 13px;">Wartend</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; text-align: center;">
                        <div id="statResolved" style="font-size: 28px; font-weight: 700; color: #10B981;">-</div>
                        <div style="color: #6B7280; font-size: 13px;">Gelöst</div>
                    </div>
                </div>
                <div id="fbList"></div>
            </div>
            <!-- Detail Modal -->
            <div id="fbDetailModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: none; justify-content: center; align-items: center; z-index: 10000; padding: 20px;">
                <div id="fbDetailContent" style="background: #1a1f2e; border-radius: 16px; width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto; padding: 24px; border: 1px solid rgba(255,255,255,0.1);"></div>
            </div>
        `;

        document.getElementById('fbDetailModal').onclick = (e) => {
            if (e.target.id === 'fbDetailModal') this.closeDetail();
        };
    }

    async loadFeedbacks() {
        const listEl = document.getElementById('fbList');
        listEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #6B7280;">Laden...</div>';

        try {
            const token = sessionStorage.getItem('bea_token');
            const resp = await fetch(`${API_BASE}/api/admin/feedback`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!resp.ok) {
                const err = await resp.json();
                listEl.innerHTML = `<div style="color: #EF4444;">API Fehler: ${err.detail || resp.status}</div>`;
                return;
            }

            this.feedbacks = await resp.json();
            this.updateStats();
            this.renderList();
        } catch (e) {
            listEl.innerHTML = `<div style="color: #EF4444;">Netzwerkfehler: ${e.message}</div>`;
        }
    }

    updateStats() {
        const total = this.feedbacks.length;
        const neu = this.feedbacks.filter(f => f.status === 'neu').length;
        const waiting = this.feedbacks.filter(f => f.status && f.status.startsWith('waiting')).length;
        const resolved = this.feedbacks.filter(f => f.status === 'geloest').length;

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statNeu').textContent = neu;
        document.getElementById('statWaiting').textContent = waiting;
        document.getElementById('statResolved').textContent = resolved;
    }

    renderList() {
        const listEl = document.getElementById('fbList');
        if (!listEl) return;

        if (this.feedbacks.length === 0) {
            listEl.innerHTML = '<div style="text-align: center; padding: 40px; color: #6B7280;">Noch keine Feedbacks.</div>';
            return;
        }

        listEl.innerHTML = this.feedbacks.map((f, idx) => {
            const status = FEEDBACK_STATUS[f.status] || FEEDBACK_STATUS.neu;
            const tier = FEEDBACK_TIERS[f.tier] || FEEDBACK_TIERS[3];
            const date = new Date(f.created_at).toLocaleDateString('de-CH');
            const hasSolution = f.ai_solution_code ? '🤖' : '';
            return `
                <div onclick="feedbackAdmin.openDetail(${idx})" 
                    style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin-bottom: 12px; 
                    border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.2s;"
                    onmouseover="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(251,191,36,0.3)'"
                    onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <div>
                            <span style="background: ${tier.color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Tier ${f.tier || '?'}</span>
                            <span style="background: ${status.color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 4px;">${status.icon} ${status.label}</span>
                            ${hasSolution ? '<span style="margin-left: 4px;" title="Hat Lösungsvorschlag">🤖</span>' : ''}
                        </div>
                        <span style="color: #6B7280; font-size: 12px;">${date}</span>
                    </div>
                    <div style="color: white; margin-bottom: 8px;">${f.message || '(keine Nachricht)'}</div>
                    <div style="color: #6B7280; font-size: 12px;">${f.user_email || 'unbekannt'} · ${f.tab_context || 'unbekannt'}</div>
                </div>
            `;
        }).join('');
    }

    openDetail(idx) {
        const f = this.feedbacks[idx];
        if (!f) return;
        this.currentFeedback = f;
        this.currentSolution = null;

        const status = FEEDBACK_STATUS[f.status] || FEEDBACK_STATUS.neu;
        const tier = FEEDBACK_TIERS[f.tier] || FEEDBACK_TIERS[3];
        const date = new Date(f.created_at).toLocaleString('de-CH');

        document.getElementById('fbDetailContent').innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <h3 style="margin: 0; color: white;">Feedback #${(f.id || '').substring(0, 8)}</h3>
                <button onclick="feedbackAdmin.closeDetail()" style="background: none; border: none; color: #9CA3AF; font-size: 24px; cursor: pointer;">&times;</button>
            </div>

            <div style="margin-bottom: 20px;">
                <span style="background: ${tier.color}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px;">Tier ${f.tier}: ${tier.label}</span>
                <span style="background: ${status.color}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-left: 8px;">${status.icon} ${status.label}</span>
            </div>

            <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <div style="color: #9CA3AF; font-size: 12px; margin-bottom: 8px;">NACHRICHT</div>
                <div style="color: white; line-height: 1.5;">${f.message || '-'}</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 6px;">
                    <div style="color: #6B7280; font-size: 11px;">VON</div>
                    <div style="color: white; font-size: 13px;">${f.user_email || '-'}</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 6px;">
                    <div style="color: #6B7280; font-size: 11px;">DATUM</div>
                    <div style="color: white; font-size: 13px;">${date}</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 6px;">
                    <div style="color: #6B7280; font-size: 11px;">SEITE</div>
                    <div style="color: white; font-size: 13px;">${f.tab_context || '-'}</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 6px;">
                    <div style="color: #6B7280; font-size: 11px;">KATEGORIE</div>
                    <div style="color: white; font-size: 13px;">${f.category || '-'}</div>
                </div>
            </div>

            <!-- AI Solution Section -->
            <div style="background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1)); border: 1px solid rgba(139,92,246,0.3); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="color: #C4B5FD; font-weight: 600;">🤖 BEATRIX Lösungsvorschlag</div>
                    <button onclick="feedbackAdmin.generateSolution('${f.id}')" id="btnGenSolution"
                        style="padding: 8px 16px; border-radius: 6px; border: none; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; cursor: pointer; font-size: 13px;">
                        ✨ Lösung generieren
                    </button>
                </div>
                <div id="solutionContent" style="color: #E9D5FF;">
                    ${f.ai_solution_code ? 'Lade bestehende Lösung...' : 'Klicke auf "Lösung generieren" um einen Vorschlag von BEATRIX zu erhalten.'}
                </div>
            </div>

            <div style="color: #9CA3AF; font-size: 12px; margin-bottom: 8px;">STATUS ÄNDERN</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
                <button onclick="feedbackAdmin.setStatus('${f.id}', 'in_arbeit')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #8B5CF6; color: white; cursor: pointer;">🔧 In Arbeit</button>
                <button onclick="feedbackAdmin.setStatus('${f.id}', 'geloest')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #10B981; color: white; cursor: pointer;">✅ Gelöst</button>
                <button onclick="feedbackAdmin.setStatus('${f.id}', 'abgelehnt')" style="padding: 8px 16px; border-radius: 6px; border: none; background: #EF4444; color: white; cursor: pointer;">❌ Ablehnen</button>
            </div>

            <div style="display: flex; gap: 8px;">
                <button onclick="feedbackAdmin.createGitHubIssue('${f.id}')" style="padding: 8px 16px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: white; cursor: pointer;">🔗 GitHub Issue</button>
            </div>
        `;

        document.getElementById('fbDetailModal').style.display = 'flex';

        // Load existing solution if available
        if (f.ai_solution_code) {
            this.loadExistingSolution(f.id);
        }
    }

    async loadExistingSolution(id) {
        try {
            const token = sessionStorage.getItem('bea_token');
            const resp = await fetch(`${API_BASE}/api/admin/feedback/${id}/solution`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data.solution) {
                    this.displaySolution(data.solution);
                }
            }
        } catch (e) {
            console.error('Load solution failed:', e);
        }
    }

    async generateSolution(id) {
        const btn = document.getElementById('btnGenSolution');
        const content = document.getElementById('solutionContent');
        
        btn.disabled = true;
        btn.textContent = '⏳ Generiere...';
        content.innerHTML = '<div style="text-align: center; padding: 20px;"><div style="color: #C4B5FD;">🤖 BEATRIX analysiert das Problem...</div><div style="color: #6B7280; font-size: 12px; margin-top: 8px;">Das kann bis zu 30 Sekunden dauern.</div></div>';

        try {
            const token = sessionStorage.getItem('bea_token');
            const resp = await fetch(`${API_BASE}/api/admin/feedback/${id}/solution`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (resp.ok) {
                const data = await resp.json();
                this.displaySolution(data.solution);
                await this.loadFeedbacks(); // Refresh list
            } else {
                const err = await resp.json();
                content.innerHTML = `<div style="color: #EF4444;">Fehler: ${err.detail || 'Unbekannt'}</div>`;
            }
        } catch (e) {
            content.innerHTML = `<div style="color: #EF4444;">Netzwerkfehler: ${e.message}</div>`;
        } finally {
            btn.disabled = false;
            btn.textContent = '✨ Lösung generieren';
        }
    }

    displaySolution(solution) {
        const content = document.getElementById('solutionContent');
        if (!solution) {
            content.innerHTML = '<div style="color: #6B7280;">Keine Lösung verfügbar.</div>';
            return;
        }

        const s = solution;
        content.innerHTML = `
            <div style="margin-bottom: 16px;">
                <div style="color: #A78BFA; font-size: 12px; margin-bottom: 4px;">PROBLEMANALYSE</div>
                <div style="color: white;">${s.problem_analysis || '-'}</div>
            </div>
            
            ${s.root_cause ? `
            <div style="margin-bottom: 16px;">
                <div style="color: #A78BFA; font-size: 12px; margin-bottom: 4px;">URSACHE</div>
                <div style="color: #E9D5FF;">${s.root_cause}</div>
            </div>
            ` : ''}

            <div style="margin-bottom: 16px;">
                <div style="color: #A78BFA; font-size: 12px; margin-bottom: 4px;">LÖSUNG</div>
                <div style="color: white; line-height: 1.6;">${s.solution_description || '-'}</div>
            </div>

            ${s.implementation_steps && s.implementation_steps.length ? `
            <div style="margin-bottom: 16px;">
                <div style="color: #A78BFA; font-size: 12px; margin-bottom: 8px;">SCHRITTE</div>
                <ol style="margin: 0; padding-left: 20px; color: #E9D5FF;">
                    ${s.implementation_steps.map(step => `<li style="margin-bottom: 4px;">${step}</li>`).join('')}
                </ol>
            </div>
            ` : ''}

            ${s.code_snippet && s.code_snippet !== 'null' ? `
            <div style="margin-bottom: 16px;">
                <div style="color: #A78BFA; font-size: 12px; margin-bottom: 8px;">CODE</div>
                <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; overflow-x: auto; margin: 0;"><code style="color: #10B981; font-size: 12px; font-family: monospace;">${s.code_snippet}</code></pre>
            </div>
            ` : ''}

            <div style="display: flex; gap: 16px; flex-wrap: wrap; color: #6B7280; font-size: 12px;">
                ${s.affected_files ? `<span>📁 ${s.affected_files.join(', ')}</span>` : ''}
                ${s.estimated_effort ? `<span>⏱ ${s.estimated_effort}</span>` : ''}
                ${s.risk_level ? `<span>⚠️ Risiko: ${s.risk_level}</span>` : ''}
            </div>
        `;
    }

    closeDetail() {
        document.getElementById('fbDetailModal').style.display = 'none';
    }

    async setStatus(id, status) {
        try {
            const token = sessionStorage.getItem('bea_token');
            const resp = await fetch(`${API_BASE}/api/admin/feedback/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });

            if (resp.ok) {
                this.closeDetail();
                await this.loadFeedbacks();
            } else {
                const err = await resp.json();
                alert('Fehler: ' + (err.detail || 'Unbekannt'));
            }
        } catch (e) {
            alert('Fehler: ' + e.message);
        }
    }

    async createGitHubIssue(id) {
        if (!confirm('GitHub Issue erstellen?')) return;

        try {
            const token = sessionStorage.getItem('bea_token');
            const resp = await fetch(`${API_BASE}/api/admin/feedback/${id}/github`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (resp.ok) {
                const data = await resp.json();
                if (data.github_url) {
                    window.open(data.github_url, '_blank');
                }
                await this.loadFeedbacks();
            } else {
                const err = await resp.json();
                alert('Fehler: ' + (err.detail || 'Unbekannt'));
            }
        } catch (e) {
            alert('Fehler: ' + e.message);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

let feedbackWidget = null;
let feedbackAdmin = null;

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('bea_token')) {
        feedbackWidget = new FeedbackWidget();
    }
});

window.initFeedbackAdmin = function(containerId) {
    console.log('initFeedbackAdmin v1.2:', containerId);
    feedbackAdmin = new FeedbackAdminDashboard(containerId);
    window.feedbackAdmin = feedbackAdmin;
};

console.log('✅ BEATRIX Feedback System v1.2 loaded (with AI Solutions)');
