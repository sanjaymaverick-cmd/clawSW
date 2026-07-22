#!/bin/sh
# Phase 10 — close the direct-access gap on a remote rehearsal deploy.
#
#   sudo ./scripts/harden_firewall.sh <public-interface>      # e.g. eth0
#
# docker-compose.yml still publishes the app ports (api 8000, dashboard 8080,
# website 3000) so they work locally. On an internet-reachable VPS that means
# they're also reachable in the clear, bypassing Caddy's TLS on 80/443. This
# drops inbound traffic to those three ports arriving on the PUBLIC interface,
# leaving Caddy (80/443) as the only intended public entry point.
#
# Why DOCKER-USER and not `ufw deny`: Docker inserts its own iptables rules
# that steer traffic to published container ports BEFORE the normal INPUT
# chain ufw manages, so a plain `ufw deny 8000` never sees that traffic. The
# DOCKER-USER chain is the documented hook Docker evaluates first for
# container traffic — rules added here actually take effect.
#
# Scoping to the public interface (-i <iface>) is deliberate: Caddy reaches
# the app containers over the internal docker bridge network, not this
# interface, so those proxied requests are untouched — only external ingress
# to the raw ports is dropped.
#
# This is a live-firewall change and does NOT survive a reboot on its own; see
# the persistence caveat in the README deployment section (the rules must be
# reproduced in /etc/ufw/after.rules under the *filter table's DOCKER-USER
# chain, not added as ufw allow/deny commands).
set -eu

IFACE="${1:?usage: harden_firewall.sh <public-interface>   (e.g. eth0)}"
PORTS="8000 8080 3000"

if [ "$(id -u)" -ne 0 ]; then
  echo "must run as root (iptables needs it): sudo $0 $IFACE" >&2
  exit 1
fi

# DOCKER-USER only exists once Docker has set up its chains. Bail clearly
# rather than silently creating rules in a chain Docker will later ignore.
apply() {
  cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || return 0
  if ! "$cmd" -n -L DOCKER-USER >/dev/null 2>&1; then
    echo "${cmd}: DOCKER-USER chain not found — is Docker running? skipping." >&2
    return 0
  fi
  for port in $PORTS; do
    # Idempotent: insert only if the exact rule isn't already present, so
    # re-running (or a config-management re-apply) doesn't stack duplicates.
    if "$cmd" -C DOCKER-USER -i "$IFACE" -p tcp --dport "$port" -j DROP 2>/dev/null; then
      echo "${cmd}: DROP ${IFACE} tcp/${port} already present"
    else
      "$cmd" -I DOCKER-USER -i "$IFACE" -p tcp --dport "$port" -j DROP
      echo "${cmd}: dropped ${IFACE} tcp/${port}"
    fi
  done
}

# IPv4, plus IPv6 when the host is dual-stack (DO/Hetzner droplets usually
# are) — leaving ip6tables open would defeat the point. Each is a no-op if the
# binary or the DOCKER-USER chain is absent.
apply iptables
apply ip6tables

echo "done. Public entry point is now Caddy on 80/443 only."
echo "NOTE: this is not persistent across reboots — see the README (/etc/ufw/after.rules)."
