from fpdf import FPDF
from pathlib import Path

PAGE_BG = (246, 247, 251)
CARD_BG = (255, 255, 255)
CARD_ALT = (245, 243, 255)
PRIMARY = (125, 121, 255)
TEXT = (30, 41, 59)
MUTED = (100, 116, 139)
SUCCESS = (16, 185, 129)
WARNING = (245, 158, 11)


class FlowPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=16)
        self.set_margins(14, 14, 14)

    def header(self):
        self.set_fill_color(*PAGE_BG)
        self.rect(0, 0, self.w, self.h, style="F")

    def footer(self):
        self.set_y(-10)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 6, f"Page {self.page_no()}", align="C")

    def card(self, x, y, w, h, title=None, tint=False):
        self.set_fill_color(*(CARD_ALT if tint else CARD_BG))
        self.set_draw_color(229, 231, 235)
        self.rect(x, y, w, h, style="FD")
        if title:
            self.set_xy(x + 6, y + 5)
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(*MUTED)
            self.cell(w - 12, 5, title.upper())

    def stat_card(self, x, y, w, h, label, value, percent=None):
        self.card(x, y, w, h, label, tint=True)
        self.set_xy(x + 6, y + 15)
        self.set_font("Helvetica", "B", 24)
        self.set_text_color(*TEXT)
        self.cell(w - 12, 10, value)
        if percent is not None:
            self.progress_bar(x + 6, y + h - 12, w - 12, 5, percent)

    def progress_bar(self, x, y, w, h, percent):
        value = max(0, min(100, float(percent or 0)))
        self.set_fill_color(226, 232, 240)
        self.rect(x, y, w, h, style="F")
        self.set_fill_color(*PRIMARY)
        self.rect(x, y, (w * value) / 100.0, h, style="F")

    def section_title(self, title, subtitle=None):
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(*TEXT)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        if subtitle:
            self.set_font("Helvetica", "", 10)
            self.set_text_color(*MUTED)
            self.cell(0, 6, subtitle, new_x="LMARGIN", new_y="NEXT")


def _write_logo(pdf: FlowPDF):
    logo_path = Path(__file__).resolve().parents[1] / "src" / "assets" / "logo.png"
    if logo_path.exists():
        pdf.image(str(logo_path), x=14, y=14, w=10, h=10)


def _render_header(pdf: FlowPDF, week_range: str):
    _write_logo(pdf)
    pdf.set_xy(28, 14)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*TEXT)
    pdf.cell(0, 8, "Weekly Performance Report", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(28)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 5, week_range, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)


def generate_weekly_pdf(report: dict) -> bytes:
    pdf = FlowPDF()

    week_range = report["week_range"]
    overview = report["overview"]
    tasks = report["tasks"]
    habits = report["habits"]
    goals = report["goals"]

    pdf.add_page()
    _render_header(pdf, week_range)
    pdf.section_title("Overview", "A clean snapshot of your weekly momentum.")

    stat_y = pdf.get_y() + 4
    card_w = (pdf.w - 28 - 8) / 3
    pdf.stat_card(14, stat_y, card_w, 42, "Completion Rate", f"{overview['task_efficiency']}%", overview["task_efficiency"])
    pdf.stat_card(14 + card_w + 4, stat_y, card_w, 42, "Habit Consistency", f"{overview['habit_consistency']}%", overview["habit_consistency"])
    pdf.stat_card(14 + (card_w + 4) * 2, stat_y, card_w, 42, "Goal Progress", f"{overview['goal_progress']}%", overview["goal_progress"])

    pdf.set_y(stat_y + 50)
    pdf.card(14, pdf.get_y(), pdf.w - 28, 54, "Week Snapshot")
    pdf.set_xy(20, pdf.get_y() + 12)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*TEXT)
    pdf.cell(0, 7, f"Tasks completed: {tasks['completed_tasks']}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(20)
    pdf.cell(0, 7, f"Pending tasks: {tasks['remaining_tasks']}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(20)
    pdf.cell(0, 7, f"Active habits: {habits['active_habits']}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(20)
    pdf.cell(0, 7, f"Closest goal: {goals['top_goal']}", new_x="LMARGIN", new_y="NEXT")

    pdf.add_page()
    _render_header(pdf, week_range)
    pdf.section_title("Tasks & Habits", "Execution and consistency for the week.")

    top_y = pdf.get_y() + 4
    split_w = (pdf.w - 32) / 2
    pdf.card(14, top_y, split_w, 78, "Tasks")
    pdf.card(18 + split_w, top_y, split_w, 78, "Habits")

    pdf.set_xy(20, top_y + 14)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*TEXT)
    pdf.cell(split_w - 12, 7, f"Total Tasks: {tasks['total_tasks']}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(20)
    pdf.cell(split_w - 12, 7, f"Completed: {tasks['completed_tasks']}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(20)
    pdf.cell(split_w - 12, 7, f"Pending: {tasks['remaining_tasks']}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(20)
    pdf.cell(split_w - 12, 7, f"Completion %: {tasks['completion_percentage']}%", new_x="LMARGIN", new_y="NEXT")
    pdf.progress_bar(20, top_y + 54, split_w - 12, 6, tasks["completion_percentage"])

    pdf.set_xy(24 + split_w, top_y + 14)
    pdf.cell(split_w - 12, 7, f"Active Habits: {habits['active_habits']}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(24 + split_w)
    pdf.cell(split_w - 12, 7, f"Best Streak: {habits['best_streak']} days", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(24 + split_w)
    pdf.cell(split_w - 12, 7, f"Consistency %: {habits['habit_consistency']}%", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(24 + split_w)
    pdf.set_text_color(*WARNING)
    pdf.cell(split_w - 12, 7, f"Streak Highlight: {habits['streak_highlight']}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(*TEXT)
    pdf.progress_bar(24 + split_w, top_y + 54, split_w - 12, 6, habits["habit_consistency"])

    list_y = top_y + 88
    pdf.card(14, list_y, pdf.w - 28, 84, "Habit List")
    pdf.set_xy(20, list_y + 14)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*TEXT)
    habit_list = habits["habit_list"][:6] or [{"name": "No active habits", "consistency": 0, "streak": 0}]
    for habit in habit_list:
        pdf.cell(0, 8, f"{habit['name']}  |  {habit['consistency']}% consistency  |  {habit['streak']} day streak", new_x="LMARGIN", new_y="NEXT")

    pdf.add_page()
    _render_header(pdf, week_range)
    pdf.section_title("Goals", "Progress across your active milestones.")

    goals_y = pdf.get_y() + 4
    pdf.card(14, goals_y, pdf.w - 28, 36, "Goal Overview")
    pdf.set_xy(20, goals_y + 14)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*TEXT)
    pdf.cell(0, 7, f"Goals in progress: {goals['goals_in_progress']}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(20)
    pdf.cell(0, 7, f"Completed goals: {goals['completed_goals']}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(20)
    pdf.set_text_color(*SUCCESS)
    pdf.cell(0, 7, f"Closest to completion: {goals['top_goal']}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_y(goals_y + 46)
    goal_rows = goals["goals_data"][:6] or [{"title": "No goals yet", "goal_progress": 0}]
    for goal in goal_rows:
        row_y = pdf.get_y()
        pdf.card(14, row_y, pdf.w - 28, 20)
        pdf.set_xy(20, row_y + 5)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*TEXT)
        pdf.cell(0, 5, goal["title"])
        pdf.set_xy(pdf.w - 36, row_y + 5)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(16, 5, f"{goal.get('goal_progress', 0)}%", align="R")
        pdf.progress_bar(20, row_y + 12, pdf.w - 52, 4, goal.get("goal_progress", 0))
        pdf.set_y(row_y + 24)

    raw = pdf.output()
    if isinstance(raw, str):
        return raw.encode("latin-1")
    return bytes(raw)
