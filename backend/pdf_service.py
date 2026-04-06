from fpdf import FPDF
import tempfile
import os

class FlowPDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 15)
        self.set_text_color(17, 20, 29) # Dark accent
        self.cell(0, 10, 'HabitFlow Weekly Summary', border=False, align='C')
        self.ln(20)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_weekly_pdf(user_name: str, metrics: dict, habits: list, goals: list) -> bytes:
    """Generates a 3-page summary PDF using fpdf2."""
    pdf = FlowPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Page 1: Overview
    pdf.add_page()
    pdf.set_font('helvetica', 'B', 24)
    pdf.cell(0, 10, f"Hello {user_name or 'User'},", ln=True)
    pdf.set_font('helvetica', '', 12)
    pdf.ln(5)
    pdf.cell(0, 10, "Here is your weekly HabitFlow digest.", ln=True)
    pdf.ln(10)
    pdf.set_font('helvetica', 'B', 16)
    pdf.cell(0, 10, "Overview metrics:", ln=True)
    pdf.set_font('helvetica', '', 12)
    pdf.cell(0, 10, f"• Productivity Score: {metrics.get('productivity_score', 0)}", ln=True)
    pdf.cell(0, 10, f"• Completed Tasks: {metrics.get('completed_tasks', 0)}", ln=True)
    pdf.cell(0, 10, f"• Ongoing Habits: {metrics.get('total_habits', 0)}", ln=True)
    
    # Page 2: Deep Dive
    pdf.add_page()
    pdf.set_font('helvetica', 'B', 16)
    pdf.cell(0, 10, "Habit Status", ln=True)
    pdf.set_font('helvetica', '', 12)
    for h in habits:
        h_name = h.get('name', 'Unknown')
        h_streak = h.get('current_streak', 0)
        pdf.cell(0, 10, f"• {h_name} (Current streak: {h_streak} days)", ln=True)
        
    # Page 3: Goal Projection
    pdf.add_page()
    pdf.set_font('helvetica', 'B', 16)
    pdf.cell(0, 10, "Goal Progress", ln=True)
    pdf.set_font('helvetica', '', 12)
    for g in goals:
        g_title = g.get('title', 'Goal')
        g_prog = g.get('progress', 0)
        pdf.cell(0, 10, f"• {g_title.title()}: {g_prog:.1f}%", ln=True)

    return pdf.output(dest='S')
