import urllib.request
import json

username = "tanmanw"  # test with a known active user

# Test GitHub contributions API (jogruber)
apis = [
    ("jogruber-contributions", f"https://github-contributions-api.jogruber.de/v4/{username}?y=last"),
    ("gh-streak-stats",        f"https://streak-stats.demolab.com/api/streak?user={username}&format=json"),
    ("gh-events",              f"https://api.github.com/users/{username}/events?per_page=100"),
]

for name, url in apis:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
        r = urllib.request.urlopen(req, timeout=10)
        raw = r.read().decode()
        data = json.loads(raw)
        if isinstance(data, list):
            push_events = [e for e in data if e.get("type") == "PushEvent"]
            commit_count = sum(e["payload"].get("size", 0) for e in push_events)
            print(f"OK  {name}: {len(data)} events, ~{commit_count} commits in events window")
        elif isinstance(data, dict):
            keys = list(data.keys())[:6]
            print(f"OK  {name}: keys={keys}")
            if "total" in data:
                print(f"    total contributions: {data['total']}")
            if "contributions" in data:
                total = sum(d.get("count", 0) for d in data["contributions"])
                print(f"    sum of daily contributions: {total}")
    except Exception as e:
        print(f"FAIL {name}: {str(e)[:70]}")
    print()
