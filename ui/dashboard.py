"""Google Material Design 3 (Material You) Spectacular Dashboard.
Engineered for ultra-smooth mobile & desktop responsiveness, Google UX/UI aesthetic,
fluid animations, and crystal-clear contrast.
"""

import gradio as gr
from config.settings import MODEL_CONFIG, LOCATIONS
from services.review_service import ReviewService
from services.reply_orchestrator import ReplyOrchestrator
from services.output_validator import OutputValidator
from database.db import DatabaseService

def format_review_choice(r: dict) -> str:
    """Format review for the selector list with clear Google Material cues."""
    stars = "★" * r["rating"] + "☆" * (5 - r["rating"])
    status_icon = "🔴" if r["reply_status"] == "unanswered" else "🟢"
    status_label = "NEEDS REPLY" if r["reply_status"] == "unanswered" else "REPLIED"
    name = r.get("reviewer_name") or "Anonymous Customer"
    loc_clean = r["location"].replace(" – Head Office", "")
    
    raw_comment = r.get("comment", "")
    if raw_comment:
        snippet = raw_comment[:42] + "..." if len(raw_comment) > 42 else raw_comment
    else:
        snippet = "(Rating only — no written text)"
        
    return f"{status_icon} [{status_label}] {name} · {loc_clean} ({stars})\n\"{snippet}\" [ID:{r['id']}]"

def build_dashboard():
    review_service = ReviewService()
    orchestrator = ReplyOrchestrator()
    
    # Google Material Design 3 Soft Theme
    app_theme = gr.themes.Soft(
        primary_hue="blue",
        neutral_hue="slate",
        font=[gr.themes.GoogleFont("Google Sans"), gr.themes.GoogleFont("Inter"), "Roboto", "sans-serif"],
        radius_size="lg"
    )

    custom_css = """
    /* ==========================================================================
       GOOGLE MATERIAL DESIGN 3 (MATERIAL YOU) DESIGN SYSTEM
       ========================================================================== */
    @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Inter:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&display=swap');

    :root {
        --g-font: 'Google Sans', 'Inter', Roboto, -apple-system, sans-serif;
        --g-blue: #1a73e8;
        --g-blue-hover: #1557bf;
        --g-blue-container: #e8f0fe;
        --g-green: #1e8e3e;
        --g-green-container: #e6f4ea;
        --g-yellow: #f9ab00;
        --g-yellow-container: #fef7e0;
        --g-red: #d93025;
        --g-red-container: #fce8e6;
        --g-star: #fbbc04;

        /* Light Mode Surface Tokens */
        --g-bg-page: #f8fafd;
        --g-surface: #ffffff;
        --g-surface-elevated: #ffffff;
        --g-surface-variant: #f1f3f4;
        --g-outline: #dadce0;
        --g-outline-variant: #e8eaed;
        --g-text-main: #202124;
        --g-text-secondary: #5f6368;
        --g-text-muted: #80868b;
        --g-shadow-1: 0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15);
        --g-shadow-sm: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
    }

    /* Dark Mode (Google Dark Theme) */
    .dark, body.dark, div.dark {
        --g-bg-page: #17181c;
        --g-surface: #202124;
        --g-surface-elevated: #28292c;
        --g-surface-variant: #303134;
        --g-outline: #5f6368;
        --g-outline-variant: #3c4043;
        --g-text-main: #e8eaed;
        --g-text-secondary: #bdc1c6;
        --g-text-muted: #9aa0a6;
        --g-blue-container: rgba(26, 115, 232, 0.2);
        --g-green-container: rgba(30, 142, 62, 0.2);
        --g-yellow-container: rgba(249, 171, 0, 0.2);
        --g-red-container: rgba(217, 48, 37, 0.2);
        --g-shadow-1: 0 2px 6px 0 rgba(0,0,0,0.5);
        --g-shadow-sm: 0 1px 3px 0 rgba(0,0,0,0.4);
    }

    * {
        box-sizing: border-box;
        font-family: var(--g-font) !important;
        -webkit-font-smoothing: antialiased;
    }

    .gradio-container {
        max-width: 1360px !important;
        margin: 0 auto !important;
        padding: 16px 20px !important;
        background-color: var(--g-bg-page) !important;
    }

    /* Keyframe Animations */
    @keyframes pulseGlow {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.15); }
    }
    @keyframes slideInUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }

    /* Top Google App Header */
    .g-header {
        background: var(--g-surface);
        border: 1px solid var(--g-outline-variant);
        border-radius: 24px;
        padding: 16px 24px;
        margin-bottom: 20px;
        box-shadow: var(--g-shadow-sm);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 14px;
        transition: all 0.2s ease;
    }
    .g-brand {
        display: flex;
        align-items: center;
        gap: 14px;
    }
    .g-logo-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        box-shadow: 0 2px 6px rgba(26, 115, 232, 0.4);
    }
    .g-brand-title {
        font-size: 21px;
        font-weight: 700;
        color: var(--g-text-main);
        letter-spacing: -0.3px;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .g-brand-sub {
        font-size: 13px;
        color: var(--g-text-secondary);
        margin-top: 2px;
    }
    .g-status-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
    }
    .g-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        border: 1px solid transparent;
        white-space: nowrap;
        transition: transform 0.15s ease;
    }
    .g-chip:hover { transform: translateY(-1px); }
    .g-chip-live { background: var(--g-green-container); color: var(--g-green) !important; border-color: rgba(30, 142, 62, 0.3); }
    .g-chip-standby { background: var(--g-yellow-container); color: #b06000 !important; border-color: rgba(249, 171, 0, 0.4); }
    .g-chip-db { background: var(--g-blue-container); color: var(--g-blue) !important; border-color: rgba(26, 115, 232, 0.3); }
    .g-chip-model { background: #f3e8fd; color: #7c3aed !important; border-color: #ddd6fe; }
    .dark .g-chip-model { background: rgba(124, 58, 237, 0.2); color: #c4b5fd !important; }

    .pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: currentColor;
        animation: pulseGlow 1.8s infinite ease-in-out;
    }

    /* Google Metric Cards */
    .g-metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-bottom: 22px;
    }
    .g-metric-card {
        background: var(--g-surface);
        border: 1px solid var(--g-outline-variant);
        border-radius: 20px;
        padding: 16px 20px;
        box-shadow: var(--g-shadow-sm);
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .g-metric-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--g-shadow-1);
    }
    .g-metric-text .label {
        font-size: 12px;
        font-weight: 600;
        color: var(--g-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .g-metric-text .val {
        font-size: 24px;
        font-weight: 700;
        color: var(--g-text-main);
        margin-top: 3px;
    }
    .g-metric-badge-icon {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
    }

    /* Google Material Tabs */
    .tabs > .tab-nav {
        border-bottom: 2px solid var(--g-outline-variant) !important;
        margin-bottom: 20px !important;
        gap: 8px !important;
    }
    .tabs > .tab-nav > button {
        font-size: 14px !important;
        font-weight: 600 !important;
        padding: 10px 20px !important;
        border-radius: 24px 24px 0 0 !important;
        color: var(--g-text-secondary) !important;
        border: none !important;
        transition: all 0.2s ease !important;
    }
    .tabs > .tab-nav > button.selected {
        color: var(--g-blue) !important;
        border-bottom: 3px solid var(--g-blue) !important;
        background: transparent !important;
    }

    /* Google Maps Review Card (Right View) */
    .g-review-hero {
        background: var(--g-surface);
        border: 1px solid var(--g-outline-variant);
        border-radius: 24px;
        padding: 24px;
        box-shadow: var(--g-shadow-sm);
        margin-bottom: 20px;
        animation: slideInUp 0.3s ease-out;
    }
    .g-user-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;
        flex-wrap: wrap;
    }
    .g-user-info {
        display: flex;
        align-items: center;
        gap: 14px;
    }
    .g-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1a73e8 0%, #8ab4f8 100%);
        color: #ffffff;
        font-size: 19px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(26, 115, 232, 0.3);
        flex-shrink: 0;
    }
    .g-user-name {
        font-size: 17px;
        font-weight: 700;
        color: var(--g-text-main);
    }
    .g-user-meta {
        font-size: 13px;
        color: var(--g-text-secondary);
        margin-top: 2px;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }
    .g-badge-verified {
        color: var(--g-blue);
        background: var(--g-blue-container);
        font-size: 11.5px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 6px;
    }
    .g-status-pill-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .g-status-unanswered {
        background: var(--g-yellow-container);
        color: #b06000 !important;
        border: 1px solid rgba(249, 171, 0, 0.4);
    }
    .g-status-replied {
        background: var(--g-green-container);
        color: var(--g-green) !important;
        border: 1px solid rgba(30, 142, 62, 0.4);
    }

    .g-stars-row {
        margin: 14px 0 8px 0;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .star-solid { color: var(--g-star); font-size: 22px; }
    .star-empty { color: var(--g-outline); font-size: 22px; }

    .g-review-body {
        background: var(--g-surface-variant);
        border-radius: 16px;
        padding: 16px 20px;
        color: var(--g-text-main);
        font-size: 15px;
        line-height: 1.6;
        margin-top: 10px;
        word-break: break-word;
        border-left: 4px solid var(--g-blue);
    }

    .g-reply-card {
        background: var(--g-green-container);
        border: 1px solid rgba(30, 142, 62, 0.3);
        border-left: 4px solid var(--g-green);
        border-radius: 16px;
        padding: 16px 20px;
        margin-top: 16px;
        color: var(--g-text-main);
    }
    .g-reply-header {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--g-green);
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    /* Review Queue Cards (Left Column) */
    .g-review-list label {
        background: var(--g-surface) !important;
        border: 1.5px solid var(--g-outline-variant) !important;
        border-radius: 16px !important;
        padding: 14px 16px !important;
        margin-bottom: 10px !important;
        cursor: pointer !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        box-shadow: 0 1px 2px rgba(60,64,67,0.06) !important;
    }
    .g-review-list label:hover {
        border-color: var(--g-blue) !important;
        background: var(--g-surface-elevated) !important;
        transform: translateY(-2px);
        box-shadow: var(--g-shadow-sm) !important;
    }
    .g-review-list label[data-checked="true"],
    .g-review-list label:has(input:checked) {
        border-color: var(--g-blue) !important;
        background: var(--g-blue-container) !important;
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.3) !important;
    }
    .g-review-list label span,
    .g-review-list label div,
    .g-review-list label input + span {
        color: var(--g-text-main) !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        line-height: 1.45 !important;
        white-space: pre-wrap !important;
        word-break: break-word !important;
    }

    /* AI Draft Studio Box */
    .g-ai-studio {
        background: var(--g-surface);
        border: 1px solid var(--g-outline-variant);
        border-radius: 24px;
        padding: 22px;
        box-shadow: var(--g-shadow-sm);
        margin-bottom: 20px;
    }
    .g-ai-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
    }
    .g-ai-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--g-text-main);
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .g-ai-model-tag {
        background: #ede9fe;
        color: #7c3aed;
        font-size: 11.5px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 12px;
    }

    /* Google Sparkle Button */
    .btn-sparkle {
        background: linear-gradient(135deg, #1a73e8 0%, #4285f4 50%, #9333ea 100%) !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 24px !important;
        font-weight: 600 !important;
        padding: 10px 22px !important;
        box-shadow: 0 2px 6px rgba(26, 115, 232, 0.4) !important;
        transition: all 0.2s ease !important;
    }
    .btn-sparkle:hover {
        transform: translateY(-1px) scale(1.02) !important;
        box-shadow: 0 4px 12px rgba(26, 115, 232, 0.5) !important;
    }

    /* Pill Badges */
    .g-val-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border-radius: 20px;
        font-size: 12.5px;
        font-weight: 600;
        margin-top: 8px;
    }
    .g-val-ok { background: var(--g-green-container); color: var(--g-green) !important; border: 1px solid rgba(30,142,62,0.3); }
    .g-val-warn { background: var(--g-yellow-container); color: #b06000 !important; border: 1px solid rgba(249,171,0,0.4); }
    .g-val-err { background: var(--g-red-container); color: var(--g-red) !important; border: 1px solid rgba(217,48,37,0.3); }

    /* Touch targets and Inputs */
    input, textarea, select {
        border-radius: 12px !important;
        border-color: var(--g-outline) !important;
    }
    button {
        border-radius: 20px !important;
        min-height: 42px !important;
        font-weight: 600 !important;
        letter-spacing: 0.2px !important;
    }

    /* ==========================================================================
       MOBILE RESPONSIVENESS (PHONES & TABLETS)
       ========================================================================== */
    @media (max-width: 900px) {
        .g-metrics-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
        }
        .g-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 16px !important;
        }
        .g-status-chips {
            width: 100% !important;
            justify-content: flex-start !important;
        }
    }

    @media (max-width: 600px) {
        .gradio-container {
            padding: 8px !important;
        }
        .g-brand-title {
            font-size: 18px !important;
        }
        .g-metrics-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
        }
        .g-metric-card {
            padding: 12px 14px !important;
            border-radius: 16px !important;
        }
        .g-metric-text .val {
            font-size: 20px !important;
        }
        .g-metric-badge-icon {
            width: 36px !important;
            height: 36px !important;
            font-size: 16px !important;
        }
        .g-review-hero {
            padding: 16px !important;
            border-radius: 18px !important;
        }
        .g-avatar {
            width: 40px !important;
            height: 40px !important;
            font-size: 16px !important;
        }
        .g-review-list label {
            padding: 10px 12px !important;
            font-size: 13px !important;
        }
    }
    """

    def calculate_kpis():
        reviews = DatabaseService.get_reviews()
        total = len(reviews)
        unanswered = sum(1 for r in reviews if r["reply_status"] == "unanswered")
        replied = sum(1 for r in reviews if r["reply_status"] == "replied")
        avg_rating = round(sum(r["rating"] for r in reviews) / total, 1) if total > 0 else 5.0
        return total, unanswered, replied, avg_rating

    with gr.Blocks(title="Goa Courier Services™ | Google Review Response Workstation") as app:
        # State variables
        state_service = gr.State(review_service)
        state_orchestrator = gr.State(orchestrator)
        state_selected_id = gr.State(None)
        state_original_draft = gr.State("")

        is_connected = review_service.is_connected_to_google()
        conn_chip_class = "g-chip-live" if is_connected else "g-chip-standby"
        conn_chip_text = "Google GBP: Connected" if is_connected else "Google GBP: Standby (Local Mode)"

        # 1. Google App Top Header Bar
        gr.HTML(f"""
        <div class="g-header">
            <div class="g-brand">
                <div class="g-logo-icon">📦</div>
                <div>
                    <h1 class="g-brand-title">Goa Courier Services™ <span style="font-size:12px; font-weight:500; background:#e8f0fe; color:#1a73e8; padding:3px 8px; border-radius:12px;">Google Verified</span></h1>
                    <div class="g-brand-sub">Google Business Profile Review Response Workstation &middot; Official Console v1.0</div>
                </div>
            </div>
            <div class="g-status-chips">
                <span class="g-chip g-chip-db"><span class="pulse-dot"></span> SQLite Active</span>
                <span class="g-chip {conn_chip_class}"><span class="pulse-dot"></span> {conn_chip_text}</span>
                <span class="g-chip g-chip-model">🤖 {MODEL_CONFIG.display_name}</span>
            </div>
        </div>
        """)

        # 2. Main Navigation Tabs
        with gr.Tabs():
            # =========================================================================
            # TAB 1: WORKSTATION
            # =========================================================================
            with gr.TabItem("💬 Review Workstation"):
                
                # Material KPI Summary Cards
                tot, unans, rep, avg_r = calculate_kpis()
                kpi_strip_html = gr.HTML(f"""
                <div class="g-metrics-grid">
                    <div class="g-metric-card">
                        <div class="g-metric-text">
                            <div class="label">Total Reviews</div>
                            <div class="val">{tot}</div>
                        </div>
                        <div class="g-metric-badge-icon" style="background:#e8f0fe; color:#1a73e8;">📬</div>
                    </div>
                    <div class="g-metric-card">
                        <div class="g-metric-text">
                            <div class="label">Needs Reply</div>
                            <div class="val" style="color:#b06000;">{unans}</div>
                        </div>
                        <div class="g-metric-badge-icon" style="background:#fef7e0; color:#f9ab00;">⏳</div>
                    </div>
                    <div class="g-metric-card">
                        <div class="g-metric-text">
                            <div class="label">Replied</div>
                            <div class="val" style="color:#1e8e3e;">{rep}</div>
                        </div>
                        <div class="g-metric-badge-icon" style="background:#e6f4ea; color:#1e8e3e;">✅</div>
                    </div>
                    <div class="g-metric-card">
                        <div class="g-metric-text">
                            <div class="label">Average Score</div>
                            <div class="val" style="color:#7c3aed;">{avg_r} ★</div>
                        </div>
                        <div class="g-metric-badge-icon" style="background:#ede9fe; color:#7c3aed;">⭐</div>
                    </div>
                </div>
                """)

                with gr.Row():
                    # Left Column: Search, Filter Chips, Review Feed
                    with gr.Column(scale=5, min_width=320):
                        with gr.Group():
                            gr.Markdown("##### 🔍 Search & Filters")
                            with gr.Row():
                                loc_filter = gr.Dropdown(
                                    label="Branch Location",
                                    choices=["All Locations"] + LOCATIONS,
                                    value="All Locations",
                                    interactive=True,
                                    scale=3
                                )
                                status_filter = gr.Radio(
                                    label="Review Status",
                                    choices=["All", "Unanswered", "Replied"],
                                    value="All",
                                    interactive=True,
                                    scale=3
                                )

                            search_box = gr.Textbox(
                                label="Search Reviews",
                                placeholder="🔍 Type customer name, branch, or keywords...",
                                interactive=True
                            )

                            with gr.Row():
                                refresh_btn = gr.Button("🔄 Refresh Reviews", variant="secondary", size="sm")

                        gr.Markdown("##### 📋 Review Inbox")
                        initial_reviews = review_service.get_reviews()
                        choices = [format_review_choice(r) for r in initial_reviews]

                        review_selector = gr.Radio(
                            choices=choices,
                            value=choices[0] if choices else None,
                            label="Select a review to inspect and reply",
                            interactive=True,
                            elem_classes=["g-review-list"]
                        )

                    # Right Column: Google Maps Style Detail Hero & Response Studio
                    with gr.Column(scale=7, min_width=320):
                        review_detail_html = gr.HTML(
                            value="<div class='g-review-hero'><em>Please select a review from the left queue to view details.</em></div>"
                        )

                        # Google AI Response Studio
                        with gr.Group(elem_classes=["g-ai-studio"]):
                            gr.HTML("""
                            <div class="g-ai-title-row">
                                <div class="g-ai-title">✨ Google AI Reply Studio</div>
                                <div class="g-ai-model-tag">Model: Qwen3-4B-Instruct</div>
                            </div>
                            """)
                            
                            with gr.Row():
                                generate_btn = gr.Button("✨ Draft with AI", elem_classes=["btn-sparkle"], scale=3)
                                regenerate_btn = gr.Button("🔄 Regenerate", variant="secondary", scale=1)
                                reset_btn = gr.Button("↩️ Reset", variant="secondary", scale=1)

                            draft_editor = gr.Textbox(
                                label="Approved Reply Editor (Review, customize, and polish text before sending)",
                                placeholder="Click 'Draft with AI' to compose an SEO-aware response grounded in approved business rules...",
                                lines=5,
                                interactive=True
                            )

                            with gr.Row():
                                word_count_display = gr.HTML(
                                    value="<div class='g-val-badge g-val-ok'>Words: 0 | Characters: 0 | Target: 35–75 words (Max: 100)</div>"
                                )

                            validation_alert = gr.HTML(value="")

                        # Google Business Safe Publishing Gate
                        with gr.Group():
                            gr.Markdown("##### 🚀 Safe Publication Gate")
                            gr.Markdown(
                                "🛡️ **Operating Rule:** *AI drafts; a human approves; the official Google API publishes.* "
                                "Publishing sends the exact text above to Google Business Profile."
                            )
                            confirm_checkbox = gr.Checkbox(
                                label="I verify this response adheres to Goa Courier Services brand standards, accuracy, and SEO policies.",
                                value=False,
                                interactive=True
                            )
                            send_reply_btn = gr.Button(
                                "📤 Publish Reply to Google Maps / Search",
                                variant="primary",
                                interactive=False
                            )
                            publish_result_display = gr.HTML(value="")

            # =========================================================================
            # TAB 2: MANAGE CONFIGURATION
            # =========================================================================
            with gr.TabItem("⚙️ Manage Configuration"):
                gr.Markdown("### ⚙️ System Settings & Integration Hub")
                gr.Markdown("Configure Google Cloud OAuth credentials, AI Inference Provider settings, business grounding facts, and SEO rules. All parameters are saved persistently to SQLite (`data/app.db`).")

                with gr.Row():
                    # Column 1: Google OAuth
                    with gr.Column(min_width=300):
                        with gr.Group():
                            gr.Markdown("#### 🔑 Google Cloud OAuth 2.0 Credentials")
                            cfg_google_id = gr.Textbox(
                                label="Google Client ID",
                                value=DatabaseService.get_config("google_client_id"),
                                placeholder="xxxxxxxx.apps.googleusercontent.com"
                            )
                            cfg_google_secret = gr.Textbox(
                                label="Google Client Secret",
                                type="password",
                                value=DatabaseService.get_config("google_client_secret"),
                                placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                            )
                            cfg_google_redirect = gr.Textbox(
                                label="Authorized Redirect URI",
                                value=DatabaseService.get_config("google_redirect_uri", "http://127.0.0.1:7860/oauth2callback")
                            )

                            with gr.Row():
                                gen_oauth_btn = gr.Button("🔗 Generate Sign-in URL", size="sm")
                            oauth_url_display = gr.Textbox(label="OAuth Authorization URL (Open in browser)", interactive=False, visible=False)

                            with gr.Row():
                                oauth_code_box = gr.Textbox(label="Paste Google Authorization Code", placeholder="4/0AW...", scale=3)
                                submit_code_btn = gr.Button("Authorize Token", variant="primary", scale=1)
                            oauth_connect_status = gr.HTML("")

                    # Column 2: AI Provider
                    with gr.Column(min_width=300):
                        with gr.Group():
                            gr.Markdown("#### 🤖 AI Model & Inference Provider")
                            cfg_provider_name = gr.Dropdown(
                                label="Inference Provider",
                                choices=["huggingface", "openrouter", "ollama_local", "together_ai", "custom"],
                                value=DatabaseService.get_config("model_provider", "huggingface")
                            )
                            cfg_model_repo = gr.Textbox(
                                label="Model Identity (Fixed per SRS Specification)",
                                value="Qwen/Qwen3-4B-Instruct-2507",
                                interactive=False
                            )
                            cfg_api_url = gr.Textbox(
                                label="Provider API Base URL",
                                value=DatabaseService.get_config("model_api_base_url")
                            )
                            cfg_api_key = gr.Textbox(
                                label="Provider API Key",
                                type="password",
                                value=DatabaseService.get_config("model_api_key"),
                                placeholder="Enter API Key (e.g. hf_...)"
                            )
                            with gr.Row():
                                cfg_temp = gr.Slider(label="Temperature", minimum=0.1, maximum=1.0, value=float(DatabaseService.get_config("model_temperature", "0.35")), step=0.05)
                                cfg_max_tokens = gr.Slider(label="Max Output Tokens", minimum=50, maximum=500, value=int(DatabaseService.get_config("model_max_tokens", "220")), step=10)

                with gr.Row():
                    # Column 3: Company Grounding
                    with gr.Column(min_width=300):
                        with gr.Group():
                            gr.Markdown("#### 🏢 Company Knowledge Base & Grounding")
                            cfg_comp_name = gr.Textbox(label="Business Legal Name", value=DatabaseService.get_config("company_name", "Goa Courier Services™"))
                            cfg_comp_email = gr.Textbox(label="Customer Inquiry Email", value=DatabaseService.get_config("company_email", "inquiry@goacourierservices.com"))
                            cfg_comp_web = gr.Textbox(label="Company Website", value=DatabaseService.get_config("company_website", "www.goacourierservices.com"))

                    # Column 4: SEO Rules
                    with gr.Column(min_width=300):
                        with gr.Group():
                            gr.Markdown("#### 🏷️ Approved SEO Keywords")
                            cfg_seo_phrases = gr.Textbox(
                                label="SEO Keywords (Comma-separated)",
                                value=DatabaseService.get_config("seo_phrases"),
                                lines=3
                            )
                            gr.Markdown("*Policy:* Inject maximum 1–2 relevant phrases naturally. No keyword-stuffing.")

                save_configs_btn = gr.Button("💾 Save Configurations to SQLite Database", variant="primary", size="lg")
                save_configs_msg = gr.HTML("")

            # =========================================================================
            # TAB 3: ACTIVITY & AUDIT LOGS
            # =========================================================================
            with gr.TabItem("📜 Activity & Audit Logs"):
                gr.Markdown("### 📜 System Activity & Audit Trail")
                gr.Markdown("Permanent record of review responses published, OAuth authentication events, and configuration updates.")

                with gr.Row():
                    refresh_logs_btn = gr.Button("🔄 Refresh Audit Logs", size="sm")

                def format_logs_table():
                    logs = DatabaseService.get_audit_logs(limit=50)
                    rows = []
                    for l in logs:
                        status_color = "#1e8e3e" if l["status"] == "SUCCESS" else "#d93025"
                        status_bg = "#e6f4ea" if l["status"] == "SUCCESS" else "#fce8e6"
                        rows.append(f"""
                        <tr style="border-bottom: 1px solid var(--g-outline-variant); font-size: 13px;">
                            <td style="padding: 12px; font-family: ui-monospace, monospace; color: var(--g-text-secondary);">{l['timestamp']}</td>
                            <td style="padding: 12px; font-weight: 700; color: var(--g-text-main);">{l['action']}</td>
                            <td style="padding: 12px; color: var(--g-text-secondary);">{l['review_id'] or '-'}</td>
                            <td style="padding: 12px;">
                                <span style="background: {status_bg}; color: {status_color}; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px;">
                                    {l['status']}
                                </span>
                            </td>
                            <td style="padding: 12px; color: var(--g-text-main);">{l['message']}</td>
                        </tr>
                        """)
                    tbody = "".join(rows) if rows else "<tr><td colspan='5' style='padding:24px; text-align:center;'>No audit records recorded yet.</td></tr>"
                    return f"""
                    <div style="background: var(--g-surface); border-radius: 16px; border: 1px solid var(--g-outline-variant); overflow-x: auto; box-shadow: var(--g-shadow-sm); margin-top: 12px;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="background: var(--g-surface-variant); border-bottom: 2px solid var(--g-outline-variant); font-size: 12px; color: var(--g-text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
                                    <th style="padding: 12px;">Timestamp</th>
                                    <th style="padding: 12px;">Action</th>
                                    <th style="padding: 12px;">Review ID</th>
                                    <th style="padding: 12px;">Status</th>
                                    <th style="padding: 12px;">Details</th>
                                </tr>
                            </thead>
                            <tbody>{tbody}</tbody>
                        </table>
                    </div>
                    """

                audit_table_html = gr.HTML(value=format_logs_table())
                refresh_logs_btn.click(format_logs_table, outputs=[audit_table_html])

        # =========================================================================
        # BACKEND EVENT HANDLERS
        # =========================================================================

        def extract_review_id(choice_str: str) -> str:
            if not choice_str or "[ID:" not in choice_str:
                return None
            return choice_str.split("[ID:")[-1].replace("]", "").strip()

        def render_review_details(svc, choice_str):
            if not choice_str:
                return "<div class='g-review-hero'>No review selected.</div>", None, "", "", ""
            
            review_id = extract_review_id(choice_str)
            r = svc.get_review_by_id(review_id)
            if not r:
                return "<div class='g-review-hero'>Review not found.</div>", None, "", "", ""

            # Google Star rendering
            star_spans = []
            for i in range(1, 6):
                if i <= r["rating"]:
                    star_spans.append('<span class="star-solid">★</span>')
                else:
                    star_spans.append('<span class="star-empty">★</span>')
            stars_html = "".join(star_spans)
            
            status_class = "g-status-replied" if r["reply_status"] == "replied" else "g-status-unanswered"
            status_text = "Replied" if r["reply_status"] == "replied" else "Needs Reply"
            
            existing_reply_html = ""
            current_draft = ""
            if r.get("existing_reply"):
                existing_reply_html = f"""
                <div class="g-reply-card">
                    <div class="g-reply-header">
                        <span>📢 Official Owner Reply Published ({r['existing_reply']['update_time']}):</span>
                    </div>
                    <div style="line-height:1.6;">{r['existing_reply']['comment']}</div>
                </div>
                """
                current_draft = r['existing_reply']['comment']

            avatar_letter = (r['reviewer_name'] or 'A')[0].upper()
            comment_content = r['comment'] if r['comment'] else '<em>(Rating only &mdash; customer did not leave a written comment)</em>'

            html = f"""
            <div class="g-review-hero">
                <div class="g-user-row">
                    <div class="g-user-info">
                        <div class="g-avatar">{avatar_letter}</div>
                        <div>
                            <div class="g-user-name">{r['reviewer_name'] or 'Anonymous Customer'}</div>
                            <div class="g-user-meta">
                                <span>📍 <strong>{r['location']}</strong></span>
                                <span>&middot;</span>
                                <span>📅 {r['created_date']}</span>
                                <span>&middot;</span>
                                <span class="g-badge-verified">✓ Google Review</span>
                            </div>
                        </div>
                    </div>
                    <span class="g-status-pill-badge {status_class}">
                        {status_text}
                    </span>
                </div>
                <div class="g-stars-row">
                    {stars_html}
                    <span style="font-size:13px; font-weight:600; color:var(--g-text-secondary); margin-left:6px;">{r['rating']}.0</span>
                </div>
                <div class="g-review-body">
                    "{comment_content}"
                </div>
                {existing_reply_html}
            </div>
            """
            
            stats = OutputValidator.get_stats(current_draft)
            count_html = f"<div class='g-val-badge g-val-ok'>Words: {stats['word_count']} | Characters: {stats['char_count']} | Target: 35–75 words (Max: 100)</div>"
            return html, review_id, current_draft, current_draft, count_html

        def update_filtered_list(svc, loc, stat, search):
            filtered = svc.get_reviews(loc, stat, search)
            new_choices = [format_review_choice(r) for r in filtered]
            selected_choice = new_choices[0] if new_choices else None
            return gr.update(choices=new_choices, value=selected_choice)

        def handle_generate_reply(svc, orch, review_id):
            if not review_id:
                return "Please select a review first.", "", "<div class='g-val-badge g-val-err'>No review selected</div>", ""
            r = svc.get_review_by_id(review_id)
            if not r:
                return "Review not found.", "", "<div class='g-val-badge g-val-err'>Review not found</div>", ""

            draft, is_valid, issues = orch.generate_draft(r)
            stats = OutputValidator.get_stats(draft)

            badge_class = "g-val-ok" if is_valid and stats["in_target_range"] else ("g-val-err" if not is_valid else "g-val-warn")
            count_html = f"<div class='g-val-badge {badge_class}'>Words: {stats['word_count']} | Characters: {stats['char_count']} | Target: 35–75 words (Max: 100)</div>"
            
            alert_html = ""
            if issues:
                alert_html = f"<div class='g-val-badge {badge_class}'>" + "<br/>".join(issues) + "</div>"

            svc.save_draft(review_id, draft)
            return draft, draft, count_html, alert_html

        def handle_reset_draft(orig_draft):
            stats = OutputValidator.get_stats(orig_draft)
            is_valid, issues = OutputValidator.validate(orig_draft)
            badge_class = "g-val-ok" if is_valid and stats["in_target_range"] else ("g-val-err" if not is_valid else "g-val-warn")
            count_html = f"<div class='g-val-badge {badge_class}'>Words: {stats['word_count']} | Characters: {stats['char_count']} | Target: 35–75 words (Max: 100)</div>"
            alert_html = "<div class='g-val-badge g-val-ok'>Reset to original draft.</div>" if orig_draft else ""
            return orig_draft, count_html, alert_html

        def handle_editor_change(text):
            stats = OutputValidator.get_stats(text)
            is_valid, issues = OutputValidator.validate(text)
            
            if stats["exceeds_hard_limit"]:
                badge_class = "g-val-err"
            elif stats["in_target_range"]:
                badge_class = "g-val-ok"
            else:
                badge_class = "g-val-warn"

            count_html = f"<div class='g-val-badge {badge_class}'>Words: {stats['word_count']} | Characters: {stats['char_count']} | Target: 35–75 words (Max: 100)</div>"
            alert_html = ""
            if issues:
                alert_html = f"<div class='g-val-badge {badge_class}'>" + "<br/>".join(issues) + "</div>"

            return count_html, alert_html

        def toggle_send_button(confirmed, draft_text):
            return gr.update(interactive=bool(confirmed and draft_text and draft_text.strip()))

        def handle_publish_reply(svc, review_id, draft_text, confirmed, loc, stat, search):
            if not confirmed:
                return "<div class='g-val-badge g-val-err'>Publish aborted: Confirmation checkbox must be checked.</div>", svc, gr.update()
            if not review_id or not draft_text or not draft_text.strip():
                return "<div class='g-val-badge g-val-err'>Publish aborted: Reply text cannot be empty.</div>", svc, gr.update()

            r = svc.get_review_by_id(review_id)
            if r and r.get("existing_reply"):
                return "<div class='g-val-badge g-val-warn'>Notice: Review already has an owner reply. Overwrite prevented.</div>", svc, gr.update()

            success = svc.publish_reply(review_id, draft_text)
            if success:
                res_html = (
                    f"<div class='g-val-badge g-val-ok' style='padding: 12px 18px; margin-top: 10px; width: 100%; border-radius: 12px;'>"
                    f"✅ <strong>Published Successfully!</strong> Response published to Google Business Profile for "
                    f"<em>{r['location']}</em> &middot; Status updated to <strong>Replied</strong>."
                    f"</div>"
                )
            else:
                res_html = "<div class='g-val-badge g-val-err'>Failed to publish reply.</div>"

            filtered = svc.get_reviews(loc, stat, search)
            new_choices = [format_review_choice(x) for x in filtered]
            current_choice = next((c for c in new_choices if f"[ID:{review_id}]" in c), new_choices[0] if new_choices else None)

            return res_html, svc, gr.update(choices=new_choices, value=current_choice)

        def handle_save_all_configurations(
            g_id, g_secret, g_redir,
            prov_name, api_url, api_key, temp_val, max_tok_val,
            c_name, c_email, c_web, seo_txt
        ):
            DatabaseService.set_config("google_client_id", g_id.strip() if g_id else "")
            DatabaseService.set_config("google_client_secret", g_secret.strip() if g_secret else "")
            DatabaseService.set_config("google_redirect_uri", g_redir.strip() if g_redir else "")
            DatabaseService.set_config("model_provider", prov_name)
            DatabaseService.set_config("model_api_base_url", api_url.strip() if api_url else "")
            DatabaseService.set_config("model_api_key", api_key.strip() if api_key else "")
            DatabaseService.set_config("model_temperature", str(temp_val))
            DatabaseService.set_config("model_max_tokens", str(max_tok_val))
            DatabaseService.set_config("company_name", c_name.strip() if c_name else "")
            DatabaseService.set_config("company_email", c_email.strip() if c_email else "")
            DatabaseService.set_config("company_website", c_web.strip() if c_web else "")
            DatabaseService.set_config("seo_phrases", seo_txt.strip() if seo_txt else "")

            DatabaseService.log_audit("CONFIG_UPDATE", None, "SUCCESS", "All system configurations saved to database.")

            return "<div class='g-val-badge g-val-ok' style='margin-top:10px;'>✅ All configurations successfully saved to SQLite Database (app.db)!</div>"

        def handle_oauth_generate(svc):
            try:
                url, _ = svc.oauth_service.generate_authorization_url()
                return gr.update(value=url, visible=True)
            except Exception as e:
                return gr.update(value=f"Error generating URL: {str(e)}", visible=True)

        def handle_oauth_connect(svc, code):
            if not code or not code.strip():
                return "<div class='g-val-badge g-val-err'>Please enter the authorization code.</div>", svc
            try:
                svc.oauth_service.exchange_code_for_tokens(code.strip())
                DatabaseService.log_audit("OAUTH_AUTH", None, "SUCCESS", "Google OAuth token exchanged and stored.")
                return "<div class='g-val-badge g-val-ok'>✅ Successfully connected to Google Business Profile!</div>", svc
            except Exception as e:
                return f"<div class='g-val-badge g-val-err'>Connection failed: {str(e)}</div>", svc

        # Events
        gen_oauth_btn.click(handle_oauth_generate, inputs=[state_service], outputs=[oauth_url_display])
        submit_code_btn.click(handle_oauth_connect, inputs=[state_service, oauth_code_box], outputs=[oauth_connect_status, state_service])
        save_configs_btn.click(
            handle_save_all_configurations,
            inputs=[
                cfg_google_id, cfg_google_secret, cfg_google_redirect,
                cfg_provider_name, cfg_api_url, cfg_api_key, cfg_temp, cfg_max_tokens,
                cfg_comp_name, cfg_comp_email, cfg_comp_web, cfg_seo_phrases
            ],
            outputs=[save_configs_msg]
        )

        for trigger in [loc_filter.change, status_filter.change, search_box.input, refresh_btn.click]:
            trigger(
                update_filtered_list,
                inputs=[state_service, loc_filter, status_filter, search_box],
                outputs=[review_selector]
            )

        review_selector.change(
            render_review_details,
            inputs=[state_service, review_selector],
            outputs=[review_detail_html, state_selected_id, draft_editor, state_original_draft, word_count_display]
        )

        generate_btn.click(
            handle_generate_reply,
            inputs=[state_service, state_orchestrator, state_selected_id],
            outputs=[draft_editor, state_original_draft, word_count_display, validation_alert]
        )
        regenerate_btn.click(
            handle_generate_reply,
            inputs=[state_service, state_orchestrator, state_selected_id],
            outputs=[draft_editor, state_original_draft, word_count_display, validation_alert]
        )
        reset_btn.click(
            handle_reset_draft,
            inputs=[state_original_draft],
            outputs=[draft_editor, word_count_display, validation_alert]
        )

        draft_editor.change(
            handle_editor_change,
            inputs=[draft_editor],
            outputs=[word_count_display, validation_alert]
        )

        confirm_checkbox.change(toggle_send_button, inputs=[confirm_checkbox, draft_editor], outputs=[send_reply_btn])
        draft_editor.change(toggle_send_button, inputs=[confirm_checkbox, draft_editor], outputs=[send_reply_btn])

        send_reply_btn.click(
            handle_publish_reply,
            inputs=[state_service, state_selected_id, draft_editor, confirm_checkbox, loc_filter, status_filter, search_box],
            outputs=[publish_result_display, state_service, review_selector]
        ).then(
            render_review_details,
            inputs=[state_service, review_selector],
            outputs=[review_detail_html, state_selected_id, draft_editor, state_original_draft, word_count_display]
        )

        if choices:
            app.load(
                render_review_details,
                inputs=[state_service, review_selector],
                outputs=[review_detail_html, state_selected_id, draft_editor, state_original_draft, word_count_display]
            )

    return app, app_theme, custom_css
