"""Main Application Entrypoint for Goa Courier Services™ Review Reply System."""

import sys
from ui.dashboard import build_dashboard

def main():
    print("=" * 60)
    print("Starting Goa Courier Services™ Google Review Reply System...")
    print("UI Version: v1.0 Mobile-Responsive & Dark/Light Adaptive")
    print("=" * 60)
    app, app_theme, custom_css = build_dashboard()
    # Launch Gradio 6 with theme and css passed to launch()
    app.launch(
        server_name="127.0.0.1",
        server_port=7860,
        share=False,
        theme=app_theme,
        css=custom_css
    )

if __name__ == "__main__":
    main()
