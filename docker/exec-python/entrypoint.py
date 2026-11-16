"""
Runs inside the code-exec Job pod. Executes the mounted user code against
every mounted testcase input, then prints a single JSON result block to
stdout for the worker to read back via the pod's logs.

Memory watchdog: the pod's memory limit is a single cgroup shared by this
process and whichever testcase child is currently running. Kubernetes/
containerd sets memory.oom.group=1 on that cgroup, so a kernel OOM kill is
always *whole-container* - it kills this process too, not just the child,
with no way to tell which testcase caused it or grade the ones before it.
So we never let the kernel's OOM killer fire at all: a background thread
polls the child's own RSS and kills *it* ourselves the moment it crosses a
safety margin below the real limit, well before the cgroup total gets there.
That keeps this process alive to grade the remaining testcases. A single
allocation big enough to blow past the limit between polls can still race
the kernel killer - this catches the common case (gradual/unbounded growth),
not every pathological one.
"""
import json
import os
import subprocess
import threading
import time

WORK_DIR = "/work"
RESULT_START = "###RESULT_START###"
RESULT_END = "###RESULT_END###"
MEMORY_CHECK_INTERVAL_S = 0.05
MEMORY_SAFETY_MARGIN = 0.8

file_name = os.environ["FILE_NAME"]
testcase_count = int(os.environ["TESTCASE_COUNT"])
time_limit_ms = int(os.environ["TIME_LIMIT_MS"])
memory_limit_bytes = int(os.environ["MEMORY_LIMIT_MB"]) * 1024 * 1024 * MEMORY_SAFETY_MARGIN


def read_rss_bytes(pid):
    try:
        with open(f"/proc/{pid}/status", "r") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    return int(line.split()[1]) * 1024
    except (FileNotFoundError, ProcessLookupError):
        return None
    return None


def run_one(index):
    with open(f"{WORK_DIR}/input_{index}.txt", "r") as f:
        input_data = f.read()

    start = time.monotonic()
    timed_out = False
    memory_exceeded = [False]

    proc = subprocess.Popen(
        ["python3", f"{WORK_DIR}/{file_name}"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    stop_watchdog = threading.Event()

    def watchdog():
        while not stop_watchdog.wait(MEMORY_CHECK_INTERVAL_S):
            rss = read_rss_bytes(proc.pid)
            if rss is not None and rss > memory_limit_bytes:
                memory_exceeded[0] = True
                proc.kill()
                return

    watchdog_thread = threading.Thread(target=watchdog, daemon=True)
    watchdog_thread.start()

    try:
        stdout, stderr = proc.communicate(input=input_data, timeout=time_limit_ms / 1000)
        exit_code = proc.returncode
    except subprocess.TimeoutExpired:
        timed_out = True
        proc.kill()
        stdout, stderr = proc.communicate()
        exit_code = None
    finally:
        stop_watchdog.set()
        watchdog_thread.join(timeout=1)

    if memory_exceeded[0]:
        exit_code = None

    exec_time_ms = int((time.monotonic() - start) * 1000)

    return {
        "id": index,
        "exitCode": exit_code,
        "timedOut": timed_out,
        "memoryExceeded": memory_exceeded[0],
        "execTimeMs": exec_time_ms,
        "stdout": stdout or "",
        "stderr": stderr or "",
    }


results = [run_one(i) for i in range(1, testcase_count + 1)]

print(RESULT_START)
print(json.dumps(results))
print(RESULT_END)
