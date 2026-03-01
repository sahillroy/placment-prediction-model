import urllib.request
import json

USERNAME = "tannmayygupta"

print("=== LeetCode GraphQL - trying different query ===")
# LeetCode uses specific query format for calendar
try:
    query_body = json.dumps({
        "query": """
        query userProfileCalendar($username: String!, $year: Int) {
          matchedUser(username: $username) {
            userCalendar(year: $year) {
              totalActiveDays
              streak
              submissionCalendar
            }
          }
        }
        """,
        "variables": {"username": USERNAME, "year": 2024}
    })
    req = urllib.request.Request(
        "https://leetcode.com/graphql",
        data=query_body.encode(),
        headers={
            "Content-Type": "application/json",
            "Referer": "https://leetcode.com",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "x-csrftoken": "abc",
        },
        method="POST",
    )
    r = urllib.request.urlopen(req, timeout=15)
    data = json.loads(r.read())
    print(f"Keys: {list(data.keys())}")
    user = data.get("data", {}).get("matchedUser", {})
    print(f"matchedUser: {user}")
    if user:
        cal = user.get("userCalendar", {})
        print(f"totalActiveDays = {cal.get('totalActiveDays')}")
except Exception as e:
    print(f"FAIL: {e}")

print()
print("=== Alternative: leetcode.com/api/user/streak_counter ===")
try:
    req = urllib.request.Request(
        f"https://leetcode.com/api/user/streak_counter/",
        headers={"User-Agent": "Mozilla/5.0", "Referer": "https://leetcode.com"},
    )
    r = urllib.request.urlopen(req, timeout=10)
    print(r.read().decode()[:200])
except Exception as e:
    print(f"FAIL: {e}")

print()
print("=== Alternative: alfa /userProfile ===")
try:
    req = urllib.request.Request(
        f"https://alfa-leetcode-api.onrender.com/{USERNAME}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    r = urllib.request.urlopen(req, timeout=15)
    data = json.loads(r.read())
    print(f"Keys: {list(data.keys())[:10]}")
    for k in data.keys():
        print(f"  {k} = {str(data[k])[:60]}")
except Exception as e:
    print(f"FAIL: {e}")

print()
print("=== GitHub events: size vs commits ===")
try:
    req = urllib.request.Request(
        f"https://api.github.com/users/{USERNAME}/events?per_page=100",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    r = urllib.request.urlopen(req, timeout=12)
    events = json.loads(r.read())
    push = [e for e in events if e.get("type") == "PushEvent"]
    print(f"PushEvents: {len(push)}")
    for e in push[:3]:
        p = e.get("payload", {})
        print(f"  size={p.get('size')}, commits_arr_len={len(p.get('commits', []))}, repo={e.get('repo', {}).get('name')}")
    total_size = sum(e["payload"].get("size", 0) for e in push)
    print(f"Total commits (payload.size): {total_size}")
except Exception as e:
    print(f"FAIL: {e}")
