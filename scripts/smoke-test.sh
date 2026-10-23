#!/usr/bin/env bash
# End-to-end check of the queue API against a running server (default http://localhost:3000).
# Usage: STAFF_PIN=1234 bash scripts/smoke-test.sh
set -euo pipefail
B=${BASE_URL:-http://localhost:3000}
PIN=${STAFF_PIN:-1234}
J=/tmp/cq_cookies
rm -f $J
ok() { echo "✔ $*"; }
fail() { echo "✘ $*"; exit 1; }

t1=$(curl -sf -X POST $B/api/tickets -H 'content-type: application/json' -d '{"service":"A"}')
t2=$(curl -sf -X POST $B/api/tickets -H 'content-type: application/json' -d '{"service":"A","priority":true,"phone":"0917 123 4567"}')
t3=$(curl -sf -X POST $B/api/tickets -H 'content-type: application/json' -d '{"service":"A"}')
echo "$t1"; echo "$t2"
n1=$(echo "$t1" | node -pe 'JSON.parse(require("fs").readFileSync(0)).number')
n2=$(echo "$t2" | node -pe 'JSON.parse(require("fs").readFileSync(0)).number')
[[ "$n2" == P* ]] && ok "priority ticket $n2" || fail "priority prefix"
echo "$t2" | grep -q '"phone"' && fail "phone leaked" || ok "phone not exposed"
a3=$(echo "$t3" | node -pe 'JSON.parse(require("fs").readFileSync(0)).ahead')
[[ "$a3" == 2 ]] && ok "third ticket has 2 ahead" || fail "ahead=$a3"

bad=$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/api/tickets -H 'content-type: application/json' -d '{"service":"A","phone":"123"}')
[[ "$bad" == 400 ]] && ok "invalid phone rejected" || fail "invalid phone $bad"

c=$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/api/staff/action -H 'content-type: application/json' -d '{"action":"next","counter":1}')
[[ "$c" == 401 ]] && ok "staff action requires login" || fail "no auth $c"
w=$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/api/staff/login -H 'content-type: application/json' -d '{"pin":"0000"}')
[[ "$w" == 401 ]] && ok "wrong PIN rejected" || fail "wrong pin $w"
curl -sf -c $J -X POST $B/api/staff/login -H 'content-type: application/json' -d "{\"pin\":\"$PIN\"}" >/dev/null && ok "login"

act() { curl -sf -b $J -X POST $B/api/staff/action -H 'content-type: application/json' -d "$1"; }
r=$(act '{"action":"next","counter":1}')
echo "$r" | grep -q "\"$n2\"" && ok "priority called first ($n2)" || fail "next: $r"
act '{"action":"recall","counter":1}' >/dev/null && ok "recall"
act '{"action":"transfer","counter":1,"service":"B"}' >/dev/null && ok "transfer to Payment"
r=$(act '{"action":"next","counter":3}')
echo "$r" | grep -q "\"$n2\"" && ok "counter 3 (Payment) got transferred $n2" || fail "transfer pickup: $r"
act '{"action":"complete","counter":3}' >/dev/null && ok "complete"
r=$(act '{"action":"next","counter":1}')
echo "$r" | grep -q "\"$n1\"" && ok "then first regular ($n1)" || fail "$r"
act '{"action":"unclaimed","counter":1}' >/dev/null && ok "mark no-show"
s=$(curl -sf $B/api/state)
echo "$s" | grep -q "\"skipped\":\[{" && ok "no-show listed" || fail "skipped list"
id1=$(echo "$t1" | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
act "{\"action\":\"call\",\"counter\":2,\"id\":$id1}" >/dev/null && ok "call no-show back to counter 2"

k3=$(echo "$t3" | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
id3=$(echo "$t3" | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
v=$(curl -sf "$B/api/tickets/$id3?k=$k3")
echo "$v" | grep -q '"ahead":0' && ok "tracker shows 0 ahead" || fail "tracker $v"
x=$(curl -s -o /dev/null -w '%{http_code}' "$B/api/tickets/$id3?k=wrong")
[[ "$x" == 404 ]] && ok "tracker needs the secret key" || fail "tracker key $x"
curl -sf -X DELETE "$B/api/tickets/$id3?k=$k3" >/dev/null
curl -sf "$B/api/tickets/$id3?k=$k3" | grep -q cancelled && ok "client can cancel"
for p in / /kiosk /ticket /display /staff; do
  code=$(curl -s -o /dev/null -w '%{http_code}' $B$p); [[ "$code" == 200 ]] && ok "page $p" || fail "page $p $code"
done
echo "ALL PASSED"
