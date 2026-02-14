/**
 * BEATRIX Feedback Governance System — Frontend Module v1.0
 * =========================================================
 * 
 * Vanilla JS Implementation für:
 * - Feedback-Erfassung (User)
 * - Feedback-Dashboard (Admin)
 * - Tier-basierte Approval-Workflows
 * - Real-time Status Updates
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const FEEDBACK_CONFIG = {
    API_BASE: window.API_BASE || 'https://bea-lab-upload-production.up.railway.app',
    POLL_INTERVAL: 30000, // 30 seconds for status updates
    MAX_MESSAGE_LENGTH: 2000,
    MAX_SCREENSHOT_SIZE: 5 * 1024 * 1024, // 5MB
};

const FEEDBACK_STATUS = {
    neu: { label: 'Neu', color: '#6B7280', icon: '📥' },
    triaged: { label: 'Triaged', color: '#3B82F6', icon: '🔍' },
    waiting_user: { label: 'Warte auf Auswahl', color: '#F59E0B', icon: '👤' },
    waiting_admin: { label: 'Warte auf Admin', color: '#F59E0B', icon: '⏳' },
    waiting_owner: { label: 'Warte auf Owner', color: '#EF4444', icon: '🔴' },
    in_arbeit: { label: 'In Arbeit', color: '#8B5CF6', icon: '🔧' },
    testing: { label: 'Testing', color: '#F97316', icon: '🧪' },
    geloest: { label: 'Gelöst', color: '#10B981', icon: '✅' },
    abgelehnt: { label: 'Abgelehnt', color: '#EF4444', icon: '❌' },
};

const FEEDBACK_TIERS = {
    1: { label: 'Automatisch', color: '#10B981', description: 'Wird automatisch implementiert' },
    2: { label: 'User-Auswahl', color: '#F59E0B', description: 'Du wählst die Lösung' },
    3: { label: 'Admin-Freigabe', color: '#3B82F6', description: 'Admin muss freigeben' },
    4: { label: 'Owner-Freigabe', color: '#EF4444', description: 'Plattform-Owner entscheidet' },
};

const FEEDBACK_PRIORITY = {
    critical: { label: 'Kritisch', color: '#EF4444', icon: '🔴' },
    high: { label: 'Hoch', color: '#F97316', icon: '🟠' },
    medium: { label: 'Mittel', color: '#F59E0B', icon: '🟡' },
    low: { label: 'Niedrig', color: '#10B981', icon: '🟢' },
};

const FEEDBACK_CATEGORY = {
    bug: { label: 'Bug', icon: '🐛' },
    ux: { label: 'UX', icon: '🎨' },
    feature: { label: 'Feature', icon: '✨' },
    question: { label: 'Frage', icon: '❓' },
    other: { label: 'Sonstiges', icon: '📝' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK WIDGET (Floating Button + Modal)
// ═══════════════════════════════════════════════════════════════════════════════

class FeedbackWidget {
    constructor() {
        this.isOpen = false;
        this.screenshot = null;
        this.init();
    }

    init() {
        this.createStyles();
        this.createWidget();
        this.attachEventListeners();
    }

    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Feedback Floating Button */
            .feedback-fab {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, #1B365D 0%, #2E4A7D 100%);
                color: white;
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(27, 54, 93, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                transition: transform 0.2s, box-shadow 0.2s;
                z-index: 9998;
            }
            .feedback-fab:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(27, 54, 93, 0.5);
            }
            .feedback-fab.has-updates {
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { box-shadow: 0 4px 12px rgba(27, 54, 93, 0.4); }
                50% { box-shadow: 0 4px 20px rgba(251, 191, 36, 0.6); }
            }

            /* Feedback Modal */
            .feedback-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            .feedback-modal-overlay.open {
                display: flex;
            }
            .feedback-modal {
                background: #1a1f2e;
                border-radius: 16px;
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .feedback-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .feedback-modal-header h3 {
                margin: 0;
                color: white;
                font-size: 18px;
            }
            .feedback-modal-close {
                background: none;
                border: none;
                color: #9CA3AF;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            .feedback-modal-close:hover {
                color: white;
            }
            .feedback-modal-body {
                padding: 24px;
            }
            .feedback-form-group {
                margin-bottom: 20px;
            }
            .feedback-form-group label {
                display: block;
                color: #9CA3AF;
                font-size: 14px;
                margin-bottom: 8px;
            }
            .feedback-textarea {
                width: 100%;
                min-height: 120px;
                padding: 12px;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.05);
                color: white;
                font-size: 14px;
                resize: vertical;
                font-family: inherit;
            }
            .feedback-textarea:focus {
                outline: none;
                border-color: rgb(251, 191, 36);
            }
            .feedback-textarea::placeholder {
                color: #6B7280;
            }
            .feedback-char-count {
                text-align: right;
                font-size: 12px;
                color: #6B7280;
                margin-top: 4px;
            }
            .feedback-char-count.warning {
                color: #F59E0B;
            }
            .feedback-char-count.error {
                color: #EF4444;
            }

            /* Screenshot Button */
            .feedback-screenshot-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                border-radius: 8px;
                border: 1px dashed rgba(255, 255, 255, 0.3);
                background: transparent;
                color: #9CA3AF;
                cursor: pointer;
                width: 100%;
                font-size: 14px;
                transition: all 0.2s;
            }
            .feedback-screenshot-btn:hover {
                border-color: rgb(251, 191, 36);
                color: rgb(251, 191, 36);
            }
            .feedback-screenshot-btn.has-screenshot {
                border-color: #10B981;
                color: #10B981;
                border-style: solid;
            }
            .feedback-screenshot-preview {
                margin-top: 12px;
                position: relative;
            }
            .feedback-screenshot-preview img {
                width: 100%;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .feedback-screenshot-remove {
                position: absolute;
                top: 8px;
                right: 8px;
                background: rgba(239, 68, 68, 0.9);
                color: white;
                border: none;
                border-radius: 50%;
                width: 28px;
                height: 28px;
                cursor: pointer;
                font-size: 16px;
            }

            /* Submit Button */
            .feedback-submit-btn {
                width: 100%;
                padding: 14px;
                border-radius: 8px;
                border: none;
                background: linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(245, 158, 11) 100%);
                color: #1B365D;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .feedback-submit-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
            }
            .feedback-submit-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            /* Success State */
            .feedback-success {
                text-align: center;
                padding: 40px 20px;
            }
            .feedback-success-icon {
                font-size: 64px;
                margin-bottom: 16px;
            }
            .feedback-success h4 {
                color: white;
                margin: 0 0 8px;
            }
            .feedback-success p {
                color: #9CA3AF;
                margin: 0;
            }

            /* Context Info */
            .feedback-context {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 20px;
                font-size: 12px;
                color: #6B7280;
            }
            .feedback-context-item {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
            }
        `;
        document.head.appendChild(style);
    }

    createWidget() {
        // Floating Action Button
        this.fab = document.createElement('button');
        this.fab.className = 'feedback-fab';
        this.fab.innerHTML = '💬';
        this.fab.title = 'Feedback geben';
        document.body.appendChild(this.fab);

        // Modal
        this.overlay = document.createElement('div');
        this.overlay.className = 'feedback-modal-overlay';
        this.overlay.innerHTML = `
            <div class="feedback-modal">
                <div class="feedback-modal-header">
                    <h3>💬 Feedback geben</h3>
                    <button class="feedback-modal-close">&times;</button>
                </div>
                <div class="feedback-modal-body">
                    <div class="feedback-form" id="feedbackForm">
                        <div class="feedback-context">
                            <div class="feedback-context-item">
                                <span>Seite:</span>
                                <span id="feedbackPageContext">${this.getCurrentPage()}</span>
                            </div>
                            <div class="feedback-context-item">
                                <span>Browser:</span>
                                <span>${this.getBrowserInfo()}</span>
                            </div>
                        </div>
                        
                        <div class="feedback-form-group">
                            <label for="feedbackMessage">Was möchtest du uns mitteilen?</label>
                            <textarea 
                                id="feedbackMessage" 
                                class="feedback-textarea"
                                placeholder="Beschreibe dein Anliegen, einen Bug, oder einen Verbesserungsvorschlag..."
                                maxlength="${FEEDBACK_CONFIG.MAX_MESSAGE_LENGTH}"
                            ></textarea>
                            <div class="feedback-char-count">
                                <span id="feedbackCharCount">0</span> / ${FEEDBACK_CONFIG.MAX_MESSAGE_LENGTH}
                            </div>
                        </div>

                        <div class="feedback-form-group">
                            <label>Screenshot (optional)</label>
                            <button type="button" class="feedback-screenshot-btn" id="feedbackScreenshotBtn">
                                📷 Screenshot hinzufügen
                            </button>
                            <div class="feedback-screenshot-preview" id="feedbackScreenshotPreview" style="display: none;">
                                <img id="feedbackScreenshotImg" src="" alt="Screenshot">
                                <button type="button" class="feedback-screenshot-remove" id="feedbackScreenshotRemove">&times;</button>
                            </div>
                            <input type="file" id="feedbackScreenshotInput" accept="image/*" style="display: none;">
                        </div>

                        <button type="submit" class="feedback-submit-btn" id="feedbackSubmitBtn">
                            Feedback senden
                        </button>
                    </div>

                    <div class="feedback-success" id="feedbackSuccess" style="display: none;">
                        <div class="feedback-success-icon">✅</div>
                        <h4>Danke für dein Feedback!</h4>
                        <p>Wir werden es so schnell wie möglich bearbeiten.</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);
    }

    attachEventListeners() {
        // Open modal
        this.fab.addEventListener('click', () => this.open());

        // Close modal
        this.overlay.querySelector('.feedback-modal-close').addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        // Character count
        const textarea = document.getElementById('feedbackMessage');
        const charCount = document.getElementById('feedbackCharCount');
        textarea.addEventListener('input', () => {
            const count = textarea.value.length;
            charCount.textContent = count;
            charCount.parentElement.className = 'feedback-char-count';
            if (count > FEEDBACK_CONFIG.MAX_MESSAGE_LENGTH * 0.9) {
                charCount.parentElement.classList.add('warning');
            }
            if (count >= FEEDBACK_CONFIG.MAX_MESSAGE_LENGTH) {
                charCount.parentElement.classList.add('error');
            }
        });

        // Screenshot
        const screenshotBtn = document.getElementById('feedbackScreenshotBtn');
        const screenshotInput = document.getElementById('feedbackScreenshotInput');
        const screenshotPreview = document.getElementById('feedbackScreenshotPreview');
        const screenshotImg = document.getElementById('feedbackScreenshotImg');
        const screenshotRemove = document.getElementById('feedbackScreenshotRemove');

        screenshotBtn.addEventListener('click', () => screenshotInput.click());
        
        screenshotInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > FEEDBACK_CONFIG.MAX_SCREENSHOT_SIZE) {
                    alert('Screenshot zu groß. Maximal 5MB erlaubt.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.screenshot = e.target.result;
                    screenshotImg.src = this.screenshot;
                    screenshotPreview.style.display = 'block';
                    screenshotBtn.classList.add('has-screenshot');
                    screenshotBtn.innerHTML = '✅ Screenshot hinzugefügt';
                };
                reader.readAsDataURL(file);
            }
        });

        screenshotRemove.addEventListener('click', () => {
            this.screenshot = null;
            screenshotInput.value = '';
            screenshotPreview.style.display = 'none';
            screenshotBtn.classList.remove('has-screenshot');
            screenshotBtn.innerHTML = '📷 Screenshot hinzufügen';
        });

        // Submit
        document.getElementById('feedbackSubmitBtn').addEventListener('click', () => this.submit());

        // Keyboard shortcut (Ctrl+Shift+F)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    open() {
        this.isOpen = true;
        this.overlay.classList.add('open');
        document.getElementById('feedbackPageContext').textContent = this.getCurrentPage();
        document.getElementById('feedbackMessage').focus();
    }

    close() {
        this.isOpen = false;
        this.overlay.classList.remove('open');
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    getCurrentPage() {
        // Extract meaningful page context
        const path = window.location.pathname;
        const hash = window.location.hash;
        if (hash) return hash.replace('#', '');
        if (path === '/' || path === '/index.html') return 'Dashboard';
        return path.split('/').pop() || 'Unknown';
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Browser';
    }

    async submit() {
        const message = document.getElementById('feedbackMessage').value.trim();
        
        if (!message) {
            alert('Bitte gib eine Nachricht ein.');
            return;
        }

        const submitBtn = document.getElementById('feedbackSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Wird gesendet...';

        try {
            const token = localStorage.getItem('bea_token');
            const response = await fetch(`${FEEDBACK_CONFIG.API_BASE}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: message,
                    screenshot_url: this.screenshot,
                    tab_context: this.getCurrentPage(),
                    screen_size: `${window.innerWidth}x${window.innerHeight}`,
                    browser_info: navigator.userAgent,
                    page_url: window.location.href
                })
            });

            if (response.ok) {
                // Show success
                document.getElementById('feedbackForm').style.display = 'none';
                document.getElementById('feedbackSuccess').style.display = 'block';
                
                // Reset form
                document.getElementById('feedbackMessage').value = '';
                document.getElementById('feedbackCharCount').textContent = '0';
                this.screenshot = null;
                
                // Close after delay
                setTimeout(() => {
                    this.close();
                    // Reset modal state
                    document.getElementById('feedbackForm').style.display = 'block';
                    document.getElementById('feedbackSuccess').style.display = 'none';
                }, 2000);
            } else {
                const error = await response.json();
                alert(`Fehler: ${error.detail || 'Feedback konnte nicht gesendet werden'}`);
            }
        } catch (error) {
            console.error('Feedback submit error:', error);
            alert('Netzwerkfehler. Bitte versuche es später erneut.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Feedback senden';
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

class FeedbackAdminDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.feedbacks = [];
        this.filters = {
            status: null,
            tier: null,
            category: null,
            priority: null
        };
        this.init();
    }

    async init() {
        this.render();
        await this.loadFeedbacks();
        this.startPolling();
    }

    render() {
        this.container.innerHTML = `
            <div class="feedback-admin">
                <div class="feedback-admin-header">
                    <h2>📋 Feedback Management</h2>
                    <div class="feedback-admin-actions">
                        <button class="btn-refresh" id="feedbackRefresh">🔄 Aktualisieren</button>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="feedback-stats" id="feedbackStats">
                    <div class="stat-card">
                        <div class="stat-value" id="statTotal">-</div>
                        <div class="stat-label">Gesamt</div>
                    </div>
                    <div class="stat-card stat-neu">
                        <div class="stat-value" id="statNeu">-</div>
                        <div class="stat-label">Neu</div>
                    </div>
                    <div class="stat-card stat-waiting">
                        <div class="stat-value" id="statWaiting">-</div>
                        <div class="stat-label">Wartend</div>
                    </div>
                    <div class="stat-card stat-resolved">
                        <div class="stat-value" id="statResolved">-</div>
                        <div class="stat-label">Gelöst</div>
                    </div>
                </div>

                <!-- Filters -->
                <div class="feedback-filters">
                    <select id="filterStatus" class="filter-select">
                        <option value="">Alle Status</option>
                        ${Object.entries(FEEDBACK_STATUS).map(([key, val]) => 
                            `<option value="${key}">${val.icon} ${val.label}</option>`
                        ).join('')}
                    </select>
                    <select id="filterTier" class="filter-select">
                        <option value="">Alle Tiers</option>
                        ${Object.entries(FEEDBACK_TIERS).map(([key, val]) => 
                            `<option value="${key}">Tier ${key}: ${val.label}</option>`
                        ).join('')}
                    </select>
                    <select id="filterPriority" class="filter-select">
                        <option value="">Alle Prioritäten</option>
                        ${Object.entries(FEEDBACK_PRIORITY).map(([key, val]) => 
                            `<option value="${key}">${val.icon} ${val.label}</option>`
                        ).join('')}
                    </select>
                    <select id="filterCategory" class="filter-select">
                        <option value="">Alle Kategorien</option>
                        ${Object.entries(FEEDBACK_CATEGORY).map(([key, val]) => 
                            `<option value="${key}">${val.icon} ${val.label}</option>`
                        ).join('')}
                    </select>
                </div>

                <!-- Feedback List -->
                <div class="feedback-list" id="feedbackList">
                    <div class="feedback-loading">Lade Feedbacks...</div>
                </div>

                <!-- Detail Modal -->
                <div class="feedback-detail-modal" id="feedbackDetailModal" style="display: none;">
                    <div class="feedback-detail-content" id="feedbackDetailContent">
                    </div>
                </div>
            </div>
        `;

        this.attachAdminEventListeners();
    }

    attachAdminEventListeners() {
        // Refresh
        document.getElementById('feedbackRefresh').addEventListener('click', () => this.loadFeedbacks());

        // Filters
        ['filterStatus', 'filterTier', 'filterPriority', 'filterCategory'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const filterName = id.replace('filter', '').toLowerCase();
                this.filters[filterName] = e.target.value || null;
                this.renderFeedbackList();
            });
        });

        // Close detail modal
        document.getElementById('feedbackDetailModal').addEventListener('click', (e) => {
            if (e.target.id === 'feedbackDetailModal') {
                this.closeDetail();
            }
        });
    }

    async loadFeedbacks() {
        try {
            const token = localStorage.getItem('bea_token');
            const response = await fetch(`${FEEDBACK_CONFIG.API_BASE}/api/admin/feedback`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                this.feedbacks = await response.json();
                this.updateStats();
                this.renderFeedbackList();
            }
        } catch (error) {
            console.error('Error loading feedbacks:', error);
            document.getElementById('feedbackList').innerHTML = 
                '<div class="feedback-error">Fehler beim Laden der Feedbacks</div>';
        }
    }

    updateStats() {
        const total = this.feedbacks.length;
        const neu = this.feedbacks.filter(f => f.status === 'neu').length;
        const waiting = this.feedbacks.filter(f => 
            ['waiting_user', 'waiting_admin', 'waiting_owner'].includes(f.status)
        ).length;
        const resolved = this.feedbacks.filter(f => f.status === 'geloest').length;

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statNeu').textContent = neu;
        document.getElementById('statWaiting').textContent = waiting;
        document.getElementById('statResolved').textContent = resolved;
    }

    renderFeedbackList() {
        let filtered = this.feedbacks;

        // Apply filters
        if (this.filters.status) {
            filtered = filtered.filter(f => f.status === this.filters.status);
        }
        if (this.filters.tier) {
            filtered = filtered.filter(f => f.tier == this.filters.tier);
        }
        if (this.filters.priority) {
            filtered = filtered.filter(f => f.priority === this.filters.priority);
        }
        if (this.filters.category) {
            filtered = filtered.filter(f => f.category === this.filters.category);
        }

        const listEl = document.getElementById('feedbackList');

        if (filtered.length === 0) {
            listEl.innerHTML = '<div class="feedback-empty">Keine Feedbacks gefunden</div>';
            return;
        }

        listEl.innerHTML = filtered.map(f => this.renderFeedbackCard(f)).join('');

        // Attach click handlers
        listEl.querySelectorAll('.feedback-card').forEach(card => {
            card.addEventListener('click', () => this.openDetail(card.dataset.id));
        });
    }

    renderFeedbackCard(feedback) {
        const status = FEEDBACK_STATUS[feedback.status] || FEEDBACK_STATUS.neu;
        const priority = FEEDBACK_PRIORITY[feedback.priority] || FEEDBACK_PRIORITY.medium;
        const category = FEEDBACK_CATEGORY[feedback.category] || FEEDBACK_CATEGORY.other;
        const tier = FEEDBACK_TIERS[feedback.tier] || FEEDBACK_TIERS[3];

        const date = new Date(feedback.created_at);
        const dateStr = date.toLocaleDateString('de-CH', { 
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
        });

        return `
            <div class="feedback-card" data-id="${feedback.id}">
                <div class="feedback-card-header">
                    <div class="feedback-card-badges">
                        <span class="badge badge-priority" style="background: ${priority.color}">
                            ${priority.icon} ${priority.label}
                        </span>
                        <span class="badge badge-category">${category.icon} ${category.label}</span>
                        <span class="badge badge-tier" style="background: ${tier.color}">
                            Tier ${feedback.tier}
                        </span>
                    </div>
                    <span class="badge badge-status" style="background: ${status.color}">
                        ${status.icon} ${status.label}
                    </span>
                </div>
                <div class="feedback-card-message">${this.truncate(feedback.message, 150)}</div>
                <div class="feedback-card-meta">
                    <span>${feedback.user_email}</span>
                    <span>${dateStr}</span>
                    <span>${feedback.tab_context || 'Unbekannt'}</span>
                </div>
                ${feedback.ai_summary ? `
                    <div class="feedback-card-ai">
                        🤖 ${this.truncate(feedback.ai_summary, 100)}
                    </div>
                ` : ''}
                <div class="feedback-card-actions">
                    <button class="btn-small btn-triage" onclick="event.stopPropagation(); feedbackAdmin.triage('${feedback.id}')">
                        🔍 Triage
                    </button>
                    ${feedback.status.startsWith('waiting') ? `
                        <button class="btn-small btn-approve" onclick="event.stopPropagation(); feedbackAdmin.approve('${feedback.id}')">
                            ✅ Freigeben
                        </button>
                        <button class="btn-small btn-reject" onclick="event.stopPropagation(); feedbackAdmin.reject('${feedback.id}')">
                            ❌ Ablehnen
                        </button>
                    ` : ''}
                    <button class="btn-small btn-github" onclick="event.stopPropagation(); feedbackAdmin.createGitHubIssue('${feedback.id}')">
                        🔗 GitHub
                    </button>
                </div>
            </div>
        `;
    }

    truncate(str, length) {
        if (!str) return '';
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    }

    async openDetail(feedbackId) {
        const feedback = this.feedbacks.find(f => f.id === feedbackId);
        if (!feedback) return;

        const modal = document.getElementById('feedbackDetailModal');
        const content = document.getElementById('feedbackDetailContent');

        // Render detail view
        content.innerHTML = this.renderDetailView(feedback);
        modal.style.display = 'flex';

        // Load comments
        await this.loadComments(feedbackId);
    }

    renderDetailView(f) {
        const status = FEEDBACK_STATUS[f.status] || FEEDBACK_STATUS.neu;
        const priority = FEEDBACK_PRIORITY[f.priority] || FEEDBACK_PRIORITY.medium;
        const tier = FEEDBACK_TIERS[f.tier] || FEEDBACK_TIERS[3];

        return `
            <div class="detail-header">
                <h3>Feedback #${f.id.substring(0, 8)}</h3>
                <button class="detail-close" onclick="feedbackAdmin.closeDetail()">&times;</button>
            </div>
            
            <div class="detail-body">
                <div class="detail-section">
                    <h4>Nachricht</h4>
                    <p class="detail-message">${f.message}</p>
                </div>

                ${f.screenshot_url ? `
                    <div class="detail-section">
                        <h4>Screenshot</h4>
                        <img src="${f.screenshot_url}" class="detail-screenshot" alt="Screenshot">
                    </div>
                ` : ''}

                <div class="detail-section">
                    <h4>Status & Klassifizierung</h4>
                    <div class="detail-grid">
                        <div class="detail-field">
                            <label>Status</label>
                            <select id="detailStatus" value="${f.status}">
                                ${Object.entries(FEEDBACK_STATUS).map(([key, val]) => 
                                    `<option value="${key}" ${f.status === key ? 'selected' : ''}>
                                        ${val.icon} ${val.label}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="detail-field">
                            <label>Priorität</label>
                            <select id="detailPriority" value="${f.priority}">
                                ${Object.entries(FEEDBACK_PRIORITY).map(([key, val]) => 
                                    `<option value="${key}" ${f.priority === key ? 'selected' : ''}>
                                        ${val.icon} ${val.label}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="detail-field">
                            <label>Tier</label>
                            <div class="tier-display" style="background: ${tier.color}">
                                Tier ${f.tier}: ${tier.label}
                            </div>
                            <small>${f.tier_reason || tier.description}</small>
                        </div>
                    </div>
                </div>

                ${f.ai_summary ? `
                    <div class="detail-section detail-ai">
                        <h4>🤖 AI-Analyse</h4>
                        <p>${f.ai_summary}</p>
                        ${f.ai_solution_code ? `
                            <div class="ai-solution">
                                <h5>Lösungsvorschlag (Confidence: ${Math.round((f.ai_solution_confidence || 0) * 100)}%)</h5>
                                <pre><code>${f.ai_solution_code}</code></pre>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                ${f.solution_options && f.solution_options.length > 0 ? `
                    <div class="detail-section">
                        <h4>Lösungsoptionen (Tier 2)</h4>
                        <div class="solution-options">
                            ${f.solution_options.map(opt => `
                                <div class="solution-option ${f.user_selected_option === opt.id ? 'selected' : ''}">
                                    <strong>${opt.label}</strong>
                                    <p>${opt.description}</p>
                                    <span class="risk-badge risk-${opt.risk_level}">${opt.risk_level}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="detail-section">
                    <h4>Kontext</h4>
                    <div class="detail-context">
                        <div><strong>User:</strong> ${f.user_email}</div>
                        <div><strong>Seite:</strong> ${f.tab_context || '-'}</div>
                        <div><strong>Screen:</strong> ${f.screen_size || '-'}</div>
                        <div><strong>Erstellt:</strong> ${new Date(f.created_at).toLocaleString('de-CH')}</div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Kommentare</h4>
                    <div id="feedbackComments" class="comments-list">
                        Lade Kommentare...
                    </div>
                    <div class="comment-form">
                        <textarea id="newComment" placeholder="Kommentar hinzufügen..."></textarea>
                        <div class="comment-form-actions">
                            <label>
                                <input type="checkbox" id="commentInternal"> Intern (nur für Admins)
                            </label>
                            <button onclick="feedbackAdmin.addComment('${f.id}')">Kommentar senden</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="detail-footer">
                <button class="btn-save" onclick="feedbackAdmin.saveChanges('${f.id}')">
                    💾 Änderungen speichern
                </button>
            </div>
        `;
    }

    closeDetail() {
        document.getElementById('feedbackDetailModal').style.display = 'none';
    }

    async loadComments(feedbackId) {
        // TODO: Load comments from API
        document.getElementById('feedbackComments').innerHTML = '<em>Keine Kommentare</em>';
    }

    async addComment(feedbackId) {
        const comment = document.getElementById('newComment').value.trim();
        const isInternal = document.getElementById('commentInternal').checked;

        if (!comment) return;

        try {
            const token = localStorage.getItem('bea_token');
            await fetch(`${FEEDBACK_CONFIG.API_BASE}/api/feedback/${feedbackId}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ comment, is_internal: isInternal })
            });

            document.getElementById('newComment').value = '';
            await this.loadComments(feedbackId);
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    }

    async triage(feedbackId) {
        if (!confirm('AI-Triage erneut ausführen?')) return;

        try {
            const token = localStorage.getItem('bea_token');
            await fetch(`${FEEDBACK_CONFIG.API_BASE}/api/admin/feedback/${feedbackId}/triage`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            await this.loadFeedbacks();
        } catch (error) {
            console.error('Error triaging:', error);
        }
    }

    async approve(feedbackId) {
        const note = prompt('Freigabe-Notiz (optional):');
        
        try {
            const token = localStorage.getItem('bea_token');
            await fetch(`${FEEDBACK_CONFIG.API_BASE}/api/admin/feedback/${feedbackId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'approve', note })
            });
            await this.loadFeedbacks();
        } catch (error) {
            console.error('Error approving:', error);
        }
    }

    async reject(feedbackId) {
        const reason = prompt('Ablehnungsgrund:');
        if (!reason) return;

        try {
            const token = localStorage.getItem('bea_token');
            await fetch(`${FEEDBACK_CONFIG.API_BASE}/api/admin/feedback/${feedbackId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'reject', note: reason })
            });
            await this.loadFeedbacks();
        } catch (error) {
            console.error('Error rejecting:', error);
        }
    }

    async createGitHubIssue(feedbackId) {
        if (!confirm('GitHub Issue erstellen?')) return;

        try {
            const token = localStorage.getItem('bea_token');
            const response = await fetch(`${FEEDBACK_CONFIG.API_BASE}/api/admin/feedback/${feedbackId}/github`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.github_url) {
                    window.open(data.github_url, '_blank');
                }
            }
            await this.loadFeedbacks();
        } catch (error) {
            console.error('Error creating GitHub issue:', error);
        }
    }

    async saveChanges(feedbackId) {
        const status = document.getElementById('detailStatus').value;
        const priority = document.getElementById('detailPriority').value;

        try {
            const token = localStorage.getItem('bea_token');
            await fetch(`${FEEDBACK_CONFIG.API_BASE}/api/admin/feedback/${feedbackId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, priority })
            });

            this.closeDetail();
            await this.loadFeedbacks();
        } catch (error) {
            console.error('Error saving changes:', error);
        }
    }

    startPolling() {
        setInterval(() => this.loadFeedbacks(), FEEDBACK_CONFIG.POLL_INTERVAL);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

// Global instances
let feedbackWidget = null;
let feedbackAdmin = null;

// Initialize feedback widget on page load
document.addEventListener('DOMContentLoaded', () => {
    // Always show feedback widget for logged-in users
    if (localStorage.getItem('bea_token')) {
        feedbackWidget = new FeedbackWidget();
    }
});

// Export for use in admin page
window.initFeedbackAdmin = function(containerId) {
    feedbackAdmin = new FeedbackAdminDashboard(containerId);
    window.feedbackAdmin = feedbackAdmin;
};

console.log('BEATRIX Feedback System loaded');
