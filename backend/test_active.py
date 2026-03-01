import urllib.request
import json

USERNAME = "tannmayygupta"  # replace with your LeetCode username

print("=== Testing LeetCode Active Days sources ===\n")

# Option 1: LeetCode official GraphQL (no auth needed for public data)
print("1. LeetCode official GraphQL /graphql...")
try:
    query = '{"query":"{ matchedUser(username: \\"' + USERNAME + '\\") { userCalendar { totalActiveDays submissionCalendar streak } } }"}'
    req = urllib.request.Request(
        "https://leetcode.com/graphql",
        data=query.encode(),
        headers={
            "Content-Type": "application/json",
            "Referer": "https://leetcode.com",
            "User-Agent": "Mozilla/5.0",
        },
        method="POST",
    )
    r = urllib.request.urlopen(req, timeout=15)
    data = json.loads(r.read())
    cal = data.get("data", {}).get("matchedUser", {}).get("userCalendar", {})
    print(f"   totalActiveDays = {cal.get('totalActiveDays')}")
    print(f"   streak          = {cal.get('streak')}")
    sub_cal = cal.get("submissionCalendar", "{}")
    parsed = json.loads(sub_cal) if isinstance(sub_cal, str) else sub_cal
    print(f"   calendar days   = {len(parsed)} entries")
except Exception as e:
    print(f"   FAIL: {e}")

print()

# Option 2: alfa /calendar (may be rate limited)
print("2. alfa-leetcode-api /calendar...")
try:
    req = urllib.request.Request(
        f"https://alfa-leetcode-api.onrender.com/{USERNAME}/calendar",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    r = urllib.request.urlopen(req, timeout=15)
    data = json.loads(r.read())
    print(f"   totalActiveDays = {data.get('totalActiveDays')}")
    print(f"   errors          = {data.get('errors', 'none')}")
except Exception as e:
    print(f"   FAIL: {e}")

print()

# Option 3: faisalshohag - does it include any calendar data?
print("3. faisalshohag API full response keys...")
try:
    req = urllib.request.Request(
        f"https://leetcode-api-faisalshohag.vercel.app/{USERNAME}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    r = urllib.request.urlopen(req, timeout=15)
    data = json.loads(r.read())
    print(f"   All keys: {list(data.keys())}")
    for k in ["totalActiveDays", "streak", "submissionCalendar", "activeDays"]:
        if k in data:
            val = data[k]
            print(f"   {k} = {str(val)[:100]}")
except Exception as e:
    print(f"   FAIL: {e}")

print()
print("=== Testing GitHub Events commits count ===")
try:
    req = urllib.request.Request(
        f"https://api.github.com/users/{USERNAME}/events?per_page=100",
        headers={"User-Agent": "Mozilla/5.0", "Accept": "application/vnd.github+json"},
    )
    r = urllib.request.urlopen(req, timeout=12)
    events = json.loads(r.read())
    push_events = [e for e in events if e.get("type") == "PushEvent"]
    # Method A: payload.commits.length
    commits_a = sum(len(e.get("payload", {}).get("commits", [])) for e in push_events)
    # Method B: payload.size
    commits_b = sum(e.get("payload", {}).get("size", 0) for e in push_events)
    print(f"PushEvents: {len(push_events)}")
    print(f"Commits via payload.commits.length: {commits_a}")
    print(f"Commits via payload.size:           {commits_b}")
    if push_events:
        print(f"\nSample event payload keys: {list(push_events[0].get('payload', {}).keys())}")
except Exception as e:
    print(f"FAIL: {e}")
