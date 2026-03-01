import urllib.request
import json

USERNAME = "tannmayygupta"

print("=== GitHub events — full payload inspection ===")
try:
    req = urllib.request.Request(
        f"https://api.github.com/users/{USERNAME}/events?per_page=100",
        headers={"User-Agent": "Mozilla/5.0", "Accept": "application/vnd.github+json"},
    )
    r = urllib.request.urlopen(req, timeout=12)
    events = json.loads(r.read())
    push = [e for e in events if e.get("type") == "PushEvent"]
    if push:
        # Print full payload of first push event
        print("First PushEvent full payload:")
        print(json.dumps(push[0]["payload"], indent=2)[:800])
except Exception as e:
    print(f"FAIL: {e}")

print()
print("=== LeetCode GraphQL with correct username ===")
# Let's try a known LeetCode username
for lc_user in ["tannmayygupta", "tanmayygupta", "tanmaygupta_"]:
    try:
        query_body = json.dumps({
            "operationName": "userProfileCalendar",
            "query": "query userProfileCalendar($username: String!, $year: Int) { matchedUser(username: $username) { userCalendar(year: $year) { totalActiveDays streak submissionCalendar } } }",
            "variables": {"username": lc_user, "year": 2024}
        })
        req = urllib.request.Request(
            "https://leetcode.com/graphql",
            data=query_body.encode(),
            headers={
                "Content-Type": "application/json",
                "Referer": "https://leetcode.com",
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
            },
            method="POST",
        )
        r = urllib.request.urlopen(req, timeout=15)
        data = json.loads(r.read())
        user = data.get("data", {}).get("matchedUser")
        if user:
            cal = user.get("userCalendar", {})
            print(f"  {lc_user}: totalActiveDays={cal.get('totalActiveDays')}, streak={cal.get('streak')}")
            # count calendar entries
            sub_cal = cal.get("submissionCalendar", "{}")
            parsed = json.loads(sub_cal) if isinstance(sub_cal, str) else {}
            print(f"  Calendar entries in {lc_user}: {len(parsed)}")
            break
        else:
            print(f"  {lc_user}: user not found")
    except Exception as e:
        print(f"  {lc_user} FAIL: {e}")

print()
print("=== Try leetcode-stats-api with retry ===")
for lc_user in ["tannmayygupta", "tanmayygupta"]:
    try:
        req = urllib.request.Request(
            f"https://leetcode-stats-api.herokuapp.com/{lc_user}",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        r = urllib.request.urlopen(req, timeout=20)
        data = json.loads(r.read())
        print(f"  {lc_user}: {list(data.keys())}")
        print(f"  totalActiveDays={data.get('totalActiveDays')}, streak={data.get('streak')}")
        break
    except Exception as e:
        print(f"  {lc_user}: FAIL {str(e)[:60]}")
