"""Streamlit UI for Default vs Alternate race strategy comparison.
Run:
    streamlit run streamlit_app.py
"""
from __future__ import annotations

import os
from pathlib import Path

import plotly.graph_objects as go
import requests
import streamlit as st


def resolve_api_base() -> str:
    env_base = os.getenv("API_BASE")
    if env_base:
        return env_base

    secrets_path = Path(__file__).parent / ".streamlit" / "secrets.toml"
    if secrets_path.exists():
        try:
            import tomllib

            data = tomllib.loads(secrets_path.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data.get("API_BASE"):
                return str(data["API_BASE"])
        except Exception:
            pass

    return "http://127.0.0.1:8000"


API_BASE = resolve_api_base()


def get_compound_color(compound: str) -> str:
    colors = {
        "HARD": "#FFFFFF",
        "MEDIUM": "#FFD700",
        "SOFT": "#FF0000",
        "INTERMEDIATE": "#00FF00",
        "INTERS": "#00FF00",
        "WET": "#0000FF",
        "WETS": "#0000FF",
    }
    return colors.get((compound or "").upper(), "#9CA3AF")


def compound_short(compound: str) -> str:
    mapping = {
        "SOFT": "S",
        "MEDIUM": "M",
        "HARD": "H",
        "INTERMEDIATE": "I",
        "INTERS": "I",
        "WET": "W",
        "WETS": "W",
    }
    return mapping.get((compound or "").upper(), "?")


def stint_summary_html(stints: list[dict]) -> str:
    chunks = []
    for s in stints:
        c = s["compound"]
        color = get_compound_color(c)
        marker = compound_short(c)
        chunks.append(
            f"Laps {s['start_lap']}-{s['end_lap']}: "
            f"<span style='color:{color};font-weight:700'>●[{marker}]</span>"
        )
    return " &nbsp; → &nbsp; ".join(chunks)


st.set_page_config(page_title="F1 Strategy Predictor", page_icon="🏎️", layout="wide")

st.markdown(
    """
<style>
html, body, [class*="css"] { background-color: #0b1118; color: #f2f4f8; }
.section-card {
  border: 1px solid #2b3642; border-radius: 12px; padding: 14px 18px; background: linear-gradient(180deg,#101926,#0b1118);
}
.metric-big { font-size: 1.6rem; font-weight: 700; }
</style>
""",
    unsafe_allow_html=True,
)

st.title("🏁 F1 Race Strategy — Default vs Alternate")

with st.sidebar:
    st.header("Session Forecast")
    year = st.number_input("Season", min_value=2018, max_value=2030, value=2025)
    event = st.text_input("Track/Event", value="Monaco Grand Prix")
    driver = st.text_input("Driver", value="HAM")
    track_temp = st.slider("Track Temp (°C)", 5, 55, 32)
    air_temp = st.slider("Air Temp (°C)", 0, 45, 26)
    total_laps = st.slider("Race Laps", 10, 90, 57)
    fuel_kg = st.slider("Fuel Load (kg)", 10.0, 110.0, 28.3, 0.1)

    st.header("Weather")
    st.caption("Light/Moderate Rain → Inters, Heavy Rain → Wets")
    rainy = st.toggle("Rainy", value=False)
    rain_intensity = None
    if rainy:
        rain_intensity = st.selectbox(
            "Rain Intensity",
            ["Light/Moderate Rain", "Heavy Rain"],
        )

payload = {
    "year": int(year),
    "event": event,
    "session": "R",
    "driver": driver,
    "track_temp_c": float(track_temp),
    "air_temp_c": float(air_temp),
    "fuel_load_kg": float(fuel_kg),
    "total_laps": int(total_laps),
    "rainy": bool(rainy),
    "rain_intensity": rain_intensity,
}

resp = None
err = None
try:
    r = requests.post(f"{API_BASE}/strategy/compare", json=payload, timeout=25)
    if not r.ok:
        err = f"API error {r.status_code}: {r.text}"
    else:
        resp = r.json()
except Exception as exc:
    err = f"Could not reach API: {exc}"

if err:
    st.error(err)
    st.stop()

forecast_col, fuel_col = st.columns(2)
with forecast_col:
    st.markdown(
        "<div class='section-card'><b>Session Forecast</b><br/>"
        f"Track: {resp['session_forecast']['track_temp_c']}°C &nbsp;|&nbsp; "
        f"Air: {resp['session_forecast']['air_temp_c']}°C &nbsp;|&nbsp; "
        f"Weather: {resp['session_forecast']['rain_intensity']}"
        "</div>",
        unsafe_allow_html=True,
    )
with fuel_col:
    st.markdown(
        f"<div class='section-card'><b>Fuel Load</b><br/>{resp['fuel_load']['kg']} kg ({resp['fuel_load']['equivalent_laps']} laps)</div>",
        unsafe_allow_html=True,
    )


def card(name: str, data: dict, border_color: str):
    st.markdown(f"### {name} Strategy")
    stint_html = stint_summary_html(data.get("tyre_stints", []))

    st.markdown(
        f"<div class='section-card' style='border-color:{border_color}'>"
        f"Pit Stops: <b>{data['pit_stops']}</b> &nbsp;|&nbsp; "
        f"Pit Laps: <b>{', '.join(map(str, data['pit_laps'])) if data['pit_laps'] else 'None'}</b> &nbsp;|&nbsp; "
        f"Time: <span class='metric-big'>{data['total_time_fmt']}</span>"
        f"<br/><br/><b>Tyre Stints:</b> {stint_html}"
        f"</div>",
        unsafe_allow_html=True,
    )

    fig = go.Figure()

    # stint background spans
    for stint in data.get("tyre_stints", []):
        color = get_compound_color(stint["compound"])
        fig.add_vrect(
            x0=stint["start_lap"],
            x1=stint["end_lap"] + 0.5,
            fillcolor=color,
            opacity=0.08,
            line_width=0,
        )

    fig.add_trace(
        go.Scatter(
            x=data["lap_numbers"],
            y=data["reference_actual_lap_times"],
            name="Reference (actual/historical)",
            mode="lines",
            line=dict(color="#5f7087", width=2),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=data["lap_numbers"],
            y=data["predicted_lap_times"],
            name="Predicted",
            mode="lines",
            line=dict(color=border_color, width=2, dash="dot"),
        )
    )

    # add colored markers by active compound on smoothed line
    stint_map = {}
    for stint in data.get("tyre_stints", []):
        for lap in range(int(stint["start_lap"]), int(stint["end_lap"]) + 1):
            stint_map[lap] = stint["compound"]

    marker_colors = [get_compound_color(stint_map.get(int(l), "")) for l in data["lap_numbers"]]
    fig.add_trace(
        go.Scatter(
            x=data["lap_numbers"],
            y=data["smoothed_prediction"],
            name="Smoothed prediction",
            mode="lines+markers",
            marker=dict(color=marker_colors, size=6),
            line=dict(color=border_color, width=3),
        )
    )

    fig.update_layout(
        paper_bgcolor="#0b1118",
        plot_bgcolor="#0b1118",
        font=dict(color="#f2f4f8"),
        xaxis_title="Lap Number",
        yaxis_title="Lap Time (s)",
        legend=dict(orientation="h", yanchor="bottom", y=1.01, xanchor="left", x=0),
        margin=dict(l=10, r=10, t=40, b=10),
    )
    st.plotly_chart(fig, use_container_width=True)


left, right = st.columns(2)
with left:
    card("Default", resp["default_strategy"], "#FFD700")
with right:
    card("Alternate", resp["alternate_strategy"], "#FF0000")

st.markdown(f"### Time Delta: **{resp['delta_seconds']:+.3f}s** (Alternate - Default)")
