import subprocess
import sys

def install_fastf1():
    """Install FastF1 library for F1 data access"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "fastf1", "pandas", "numpy"])
        print("FastF1 and dependencies installed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Error installing FastF1: {e}")

if __name__ == "__main__":
    install_fastf1()
