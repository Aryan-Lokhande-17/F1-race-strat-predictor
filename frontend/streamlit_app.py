"""Streamlit UI for Default vs Alternate race strategy comparison.
Run:
    streamlit run streamlit_app.py
"""
from __future__ import annotations

import requests
import streamlit as st
import plotly.graph_objects as go

API_BASE = st.secrets.get("API_BASE", "http://127.0.0.1:8000") if hasattr(st, "secrets") else "http://127.0.0.1:8000"

st.set_page_config(page_title="F1 Strategy Predictor", page_icon="🏎️", layout="wide")

st.markdown(
    """
<style>
html, body, [class*="css"] { background-color: #0b1118; color: #f2f4f8; }
.section-card {
  border: 1px solid #2b3642; border-radius: 12px; padding: 14px 18px; background: linear-gradient(180deg,#101926,#0b1118);
}
.metric-big { font-size: 1.6rem; font-weight: 700; }
.soft { color: #ff3b30; }
.medium { color: #ffc42e; }
.hard { color: #f1f5f9; }
</style>
""",
    unsafe_allow_html=True,
)

st.title("🏁 F1 Race Strategy — Default vs Alternate")

with st.sidebar:
    st.header("Session Forecast")
    year = st.number_input("Season", min_value=2018, max_value=2030, value=2024)
    event = st.text_input("Track/Event", value="Bahrain Grand Prix")
    driver = st.text_input("Driver", value="VER")
    track_temp = st.slider("Track Temp (°C)", 15, 50, 32)
    air_temp = st.slider("Air Temp (°C)", 5, 40, 26)
    total_laps = st.slider("Race Laps", 10, 90, 57)
    fuel_kg = st.slider("Fuel Load (kg)", 10.0, 110.0, 28.3, 0.1)

payload = {
    "year": int(year),
    "event": event,
    "session": "R",
    "driver": driver,
    "track_temp_c": float(track_temp),
    "air_temp_c": float(air_temp),
    "fuel_load_kg": float(fuel_kg),
    "total_laps": int(total_laps),
}

resp = None
err = None
try:
    r = requests.post(f"{API_BASE}/strategy/compare", json=payload, timeout=20)
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
        f"<div class='section-card'><b>Session Forecast</b><br/>Track: {resp['session_forecast']['track_temp_c']}°C &nbsp; | &nbsp; Air: {resp['session_forecast']['air_temp_c']}°C</div>",
        unsafe_allow_html=True,
    )
with fuel_col:
    st.markdown(
        f"<div class='section-card'><b>Fuel Load</b><br/>{resp['fuel_load']['kg']} kg ({resp['fuel_load']['equivalent_laps']} laps)</div>",
        unsafe_allow_html=True,
    )


def card(name: str, data: dict, border_color: str):
    st.markdown(f"### {name} Strategy")
    st.markdown(
        f"<div class='section-card' style='border-color:{border_color}'>"
        f"Pit Stops: <b>{data['pit_stops']}</b> &nbsp; | &nbsp; "
        f"Pit Laps: <b>{', '.join(map(str, data['pit_laps']))}</b> &nbsp; | &nbsp; "
        f"Time: <span class='metric-big'>{data['total_time_fmt']}</span>"
        f"</div>",
        unsafe_allow_html=True,
    )

    fig = go.Figure()
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
    fig.add_trace(
        go.Scatter(
            x=data["lap_numbers"],
            y=data["smoothed_prediction"],
            name="Smoothed prediction",
            mode="lines",
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
    card("Default", resp["default_strategy"], "#ffc42e")
with right:
    card("Alternate", resp["alternate_strategy"], "#ff3b30")

st.markdown(
    f"### Time Delta: **{resp['delta_seconds']:+.3f}s** (Alternate - Default)",
)
