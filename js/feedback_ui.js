/**
 * BEATRIX Feedback Governance System — Frontend Module v1.0
 * Vanilla JS Implementation
 */

const FEEDBACK_CONFIG = {
    API_BASE: window.API_BASE || 'https://bea-lab-upload-production.up.railway.app',
    POLL_INTERVAL: 30000,
    MAX_MESSAGE_LENGTH: 2000,
};

const FEEDBACK_STATUS = {
    neu: { label: 'Neu', color: '#6B7280', icon: '📥' },
    triaged: { label: 'Triaged', color: '#3B82F6', icon: '🔍' },
    waiting_user: { label: 'Warte auf Auswahl', color: '#F59E0B', icon: '👤' },
    waiting_admin: { label: 'Warte auf Admin', color: '#F59E0B', icon: '⏳' },
    waiting_owner: { label: 'Warte auf Owner', color: '#EF4444', icon: '🔴' },
    in_arbeit: { label: 'In Arbeit', color: '#8B5CF6', icon: '🔧' },
    geloest: { label: 'Gelöst', color: '#10B981', icon: '✅' },
    abgelehnt: { label: 'Abgelehnt', color: '#EF4444', icon: '❌' },
};

const FEEDBACK_TIERS = {
    1: { label: 'Automatisch', color: '#10B981' },
    2: { label: 'User-Auswahl', color: '#F59E0B' },
    3: { label: 'Admin-Freigabe', color: '#3B82F6' },
    4: { label: 'Owner-Freigabe', color: '#EF4444' },
};

// ═══════════════════════════════════════════════════════════════
// FEEDBACK WIDGET (Floating Button)
// ═══════════════════════════════════════════════════════════════

class FeedbackWidget {
    constructor() {
        this.isOpen = false;
        this.init();
    }

    init() {
        // Create floating button
        const fab = document.createElement('button');
        fab.id = 'feedbackFab';
        fab.innerHTML = '💬';
        fab.title = 'Feedback geben (Ctrl+Shift+F)';
        fab.style.cssText = `
            position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
            border-radius: 50%; background: linear-gradient(135deg, #1B365D 0%, #2E4A7D 100%);
            color: white; border: none; cursor: pointer; font-size: 24px; z-index: 9998;
            box-shadow: 0 4px 12px rgba(27,54,93,0.4); transition: transform 0.2s;
        `;
        fab.onmouseover = () => fab.style.transform = 'scale(1.1)';
        fab.onmouseout = () => fab.style.transform = 'scale(1)';
        fab.onclick = () => this.openModal();
        document.body.appendChild(fab);

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'feedbackModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: none; align-items: center; justify-content: center; z-index: 9999;
        `;
        modal.innerHTML = `
            <div style="background: #1a1f2e; border-radius: 16px; width: 90%; max-width: 500px; padding: 24px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <h3 style="color: white; margin: 0;">💬 Feedback geben</h3>
                    <button onclick="feedbackWidget.closeModal()" style="background: none; border: none; color: #9CA3AF; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <textarea id="feedbackMessage" placeholder="Beschreibe dein Anliegen..." 
                    style="width: 100%; min-height: 120px; padding: 12px; border-radius: 8px; 
                    border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); 
                    color: white; font-size: 14px; resize: vertical; margin-bottom: 16px;"></textarea>
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

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.isOpen ? this.closeModal() : this.openModal();
            }
        });

        console.log('✅ Feedback Widget initialized');
    }

    openModal() {
        document.getElementById('feedbackModal').style.display = 'flex';
        document.getElementById('feedbackMessage').focus();
        this.isOpen = true;
    }

    closeModal() {
        document.getElementById('feedbackModal').style.display = 'none';
        this.isOpen = false;
    }

    async submit() {
        const message = document.getElementById('feedbackMessage').value.trim();
        if (!message) { alert('Bitte gib eine Nachricht ein.'); return; }

        try {
            const token = sessionStorage.getItem('bea_token');
            const resp = await fetch(`${FEEDBACK_CONFIG.API_BASE}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    message: message,
                    tab_context: location.hash.replace('#','') || 'unknown',
                    screen_size: `${window.innerWidth}x${window.innerHeight}`,
                    page_url: location.href
                })
            });

            if (resp.ok) {
                alert('✅ Danke für dein Feedback!');
                document.getElementById('feedbackMessage').value = '';
                this.closeModal();
            } else {
                const err = await resp.json();
                alert('Fehler: ' + (err.detail || 'Unbekannt'));
            }
        } catch (e) {
            console.error('Feedback error:', e);
            alert('Netzwerkfehler. Bitte versuche es später.');
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// FEEDBACK ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════

class FeedbackAdminDashboard {
    constructor(containerId) {
        console.log('FeedbackAdminDashboard constructor:', containerId);
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }
        this.feedbacks = [];
        this.init();
    }

    async init() {
        console.log('FeedbackAdminDashboard init');
        this.render();
        await this.loadFeedbacks();
    }

    render() {
        console.log('FeedbackAdminDashboard render');
        this.container.innerHTML = `
            <div style="padding: 20px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <span style="color: #9CA3AF;">Neue Feedback-Tabelle (Governance System)</span>
                    <button onclick="feedbackAdmin.loadFeedbacks()" style="padding: 8px 16px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: white; cursor: pointer;">🔄 Aktualisieren</button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
                    <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: white;" id="fbStatTotal">-</div>
                        <div style="font-size: 12px; color: #9CA3AF;">Gesamt</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #F59E0B;" id="fbStatNeu">-</div>
                        <div style="font-size: 12px; color: #9CA3AF;">Neu</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #3B82F6;" id="fbStatWaiting">-</div>
                        <div style="font-size: 12px; color: #9CA3AF;">Wartend</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #10B981;" id="fbStatResolved">-</div>
                        <div style="font-size: 12px; color: #9CA3AF;">Gelöst</div>
                    </div>
                </div>
                <div id="fbList" style="color: #9CA3AF;">Lade Feedbacks...</div>
            </div>
        `;
    }

    async loadFeedbacks() {
        console.log('Loading feedbacks...');
        const listEl = document.getElementById('fbList');
        if (!listEl) return;

        try {
            const token = sessionStorage.getItem('bea_token');
            const resp = await fetch(`${FEEDBACK_CONFIG.API_BASE}/api/admin/feedback`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('API response:', resp.status);

            if (resp.ok) {
                this.feedbacks = await resp.json();
                console.log('Feedbacks loaded:', this.feedbacks.length);
                this.updateStats();
                this.renderList();
            } else {
                const err = await resp.json();
                listEl.innerHTML = `<div style="color: #EF4444;">API Fehler: ${err.detail || resp.status}</div>`;
            }
        } catch (e) {
            console.error('Load error:', e);
            listEl.innerHTML = `<div style="color: #EF4444;">Netzwerkfehler: ${e.message}</div>`;
        }
    }

    updateStats() {
        const total = this.feedbacks.length;
        const neu = this.feedbacks.filter(f => f.status === 'neu').length;
        const waiting = this.feedbacks.filter(f => (f.status || '').startsWith('waiting')).length;
        const resolved = this.feedbacks.filter(f => f.status === 'geloest').length;

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('fbStatTotal', total);
        set('fbStatNeu', neu);
        set('fbStatWaiting', waiting);
        set('fbStatResolved', resolved);
    }

    renderList() {
        const listEl = document.getElementById('fbList');
        if (!listEl) return;

        if (this.feedbacks.length === 0) {
            listEl.innerHTML = '<div style="text-align: center; padding: 40px; color: #6B7280;">Noch keine Feedbacks in der neuen Tabelle.</div>';
            return;
        }

        listEl.innerHTML = this.feedbacks.map(f => {
            const status = FEEDBACK_STATUS[f.status] || FEEDBACK_STATUS.neu;
            const tier = FEEDBACK_TIERS[f.tier] || FEEDBACK_TIERS[3];
            const date = new Date(f.created_at).toLocaleDateString('de-CH');
            return `
                <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <div>
                            <span style="background: ${tier.color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Tier ${f.tier || '?'}</span>
                            <span style="background: ${status.color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 4px;">${status.icon} ${status.label}</span>
                        </div>
                        <span style="color: #6B7280; font-size: 12px;">${date}</span>
                    </div>
                    <div style="color: white; margin-bottom: 8px;">${f.message || '(keine Nachricht)'}</div>
                    <div style="color: #6B7280; font-size: 12px;">${f.user_email} · ${f.tab_context || 'unbekannt'}</div>
                    ${f.ai_summary ? `<div style="margin-top: 8px; padding: 8px; background: rgba(139,92,246,0.1); border-radius: 4px; font-size: 12px; color: #C4B5FD;">🤖 ${f.ai_summary}</div>` : ''}
                </div>
            `;
        }).join('');
    }
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

let feedbackWidget = null;
let feedbackAdmin = null;

// Init widget for logged-in users
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('bea_token')) {
        feedbackWidget = new FeedbackWidget();
    }
});

// Global init function for admin dashboard
window.initFeedbackAdmin = function(containerId) {
    console.log('initFeedbackAdmin called:', containerId);
    feedbackAdmin = new FeedbackAdminDashboard(containerId);
    window.feedbackAdmin = feedbackAdmin;
};

console.log('✅ BEATRIX Feedback System v1.0 loaded');
