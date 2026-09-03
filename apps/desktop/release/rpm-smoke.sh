#!/usr/bin/env bash
set -euo pipefail

version="$1"
author_rpm="$2"
assessment_rpm="$3"
user_name="csf-rpm-smoke"
home_directory="/tmp/csf-rpm-smoke-home"

cleanup() {
  zypper --non-interactive remove csf-author csf-assessment >/dev/null 2>&1 || true
  userdel -r "$user_name" >/dev/null 2>&1 || true
  rm -rf "$home_directory"
}
trap cleanup EXIT

zypper --non-interactive refresh
zypper --non-interactive install --no-recommends --allow-unsigned-rpm xorg-x11-server-Xvfb xdotool shadow "$author_rpm" "$assessment_rpm" >&2

check_metadata() {
  local rpm_file="$1"
  local package_name="$2"
  local product_name="$3"
  local application_id="$4"
  local description="$5"
  local rpm_version
  local rpm_release
  local normalized_version
  local desktop_file

  test "$(rpm -qp --qf '%{NAME}' "$rpm_file")" = "$package_name"
  rpm_version="$(rpm -qp --qf '%{VERSION}' "$rpm_file")"
  rpm_release="$(rpm -qp --qf '%{RELEASE}' "$rpm_file")"
  normalized_version="${rpm_version//_/-}"
  normalized_version="${normalized_version//\~/-}"
  test "$normalized_version" = "$version"
  test "$rpm_release" = "1"
  test "$(rpm -qp --qf '%{VENDOR}' "$rpm_file")" = "CSF Self Assessment"
  test "$(rpm -qp --qf '%{DESCRIPTION}' "$rpm_file")" = "$description"

  desktop_file="$(rpm -qlp "$rpm_file" | grep '/share/applications/.*\.desktop$')"
  test -n "$desktop_file"
  grep -Fqx "Name=$product_name" "$desktop_file"
  grep -Fq "$application_id" "$desktop_file"
  rpm -qlp "$rpm_file" | grep -Fq "/share/icons/hicolor/512x512/apps/$package_name.png"
}

check_metadata \
  "$author_rpm" \
  "csf-author" \
  "CSF Author" \
  "org.csf.selfassessment.author" \
  "Create and test Cloud Sovereignty Self-Assessment workbooks offline."
check_metadata \
  "$assessment_rpm" \
  "csf-assessment" \
  "CSF Assessment" \
  "org.csf.selfassessment.assessment" \
  "Complete and review Cloud Sovereignty Self-Assessments offline."

useradd --create-home --home-dir "$home_directory" "$user_name"

launch_and_find_window() {
  local executable="$1"
  local title="$2"
  runuser -u "$user_name" -- env HOME="$home_directory" bash -euo pipefail -c '
    executable="$1"
    title="$2"
    log_file="$3"
    export DISPLAY=:99
    Xvfb "$DISPLAY" -screen 0 1280x1024x24 >"${log_file}.xvfb" 2>&1 &
    xvfb_pid=$!
    trap '\''kill "$xvfb_pid" 2>/dev/null || true; wait "$xvfb_pid" 2>/dev/null || true'\'' EXIT
    for attempt in $(seq 1 60); do
      if xdotool getmouselocation >/dev/null 2>&1; then
        break
      fi
      if ! kill -0 "$xvfb_pid" 2>/dev/null; then
        cat "${log_file}.xvfb"
        exit 1
      fi
      sleep 1
    done
    xdotool getmouselocation >/dev/null 2>&1
    "$executable" --no-sandbox >"$log_file" 2>&1 &
    pid=$!
    for attempt in $(seq 1 60); do
      if ! kill -0 "$pid" 2>/dev/null; then
        wait "$pid" || true
        cat "$log_file"
        exit 1
      fi
      if xdotool search --name "^${title}$" >/dev/null 2>&1; then
        kill "$pid"
        wait "$pid" || true
        exit 0
      fi
      sleep 1
    done
    kill "$pid"
    wait "$pid" || true
    cat "$log_file"
    exit 1
  ' bash "$executable" "$title" "$home_directory/${title// /-}.log"
}

launch_and_find_window "$(command -v csf-author)" "Cloud Sovereignty Self-Assessment — Author"
launch_and_find_window "$(command -v csf-assessment)" "Cloud Sovereignty Self-Assessment"
