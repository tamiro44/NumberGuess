import subprocess
import os
import glob
import sys
import webbrowser

def run_tests():
    print("▶ מריץ בדיקות E2E...\n")
    result = subprocess.run(
       ["npm.cmd", "run", "test:e2e"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    print(result.stdout)

    return result.returncode, result.stdout


def open_report():
    report_path = os.path.join(os.getcwd(), "playwright-report", "index.html")
    if os.path.exists(report_path):
        print("\n📊 פותח דוח Playwright...")
        webbrowser.open(report_path)
    else:
        print("\n⚠ לא נמצא playwright-report.")


def open_latest_trace():
    trace_files = glob.glob("test-results/**/trace.zip", recursive=True)
    if trace_files:
        latest_trace = max(trace_files, key=os.path.getctime)
        print(f"\n🧭 פותח trace אחרון:\n{latest_trace}\n")
        subprocess.run(["npx", "playwright", "show-trace", latest_trace])
    else:
        print("\n⚠ לא נמצא trace.zip.")


def summarize_failure(output):
    print("\n🧠 סיכום כשל:\n")

    lines = output.splitlines()
    failed_tests = [line for line in lines if "›" in line and "failed" in line]

    if failed_tests:
        for test in failed_tests:
            print(f"❌ {test}")
    else:
        print("לא הצלחנו לחלץ שם טסט שנכשל — בדוק את הדוח.")


def main():
    code, output = run_tests()

    if code == 0:
        print("\n✅ כל הבדיקות עברו בהצלחה!")
        sys.exit(0)
    else:
        print("\n❌ נמצאו כשלים בבדיקות.")
        summarize_failure(output)
        open_report()
        open_latest_trace()
        sys.exit(1)


if __name__ == "__main__":
    main()
