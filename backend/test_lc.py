import urllib.request
import json

apis = [
    ("leetcode-stats-api", "https://leetcode-stats-api.herokuapp.com/neal_wu"),
    ("faisalshohag", "https://leetcode-api-faisalshohag.vercel.app/neal_wu"),
    ("alfa-no-rate-limit", "https://alfa-leetcode-api.onrender.com/neal_wu/solved"),
    ("lcstats", "https://lcstats.vercel.app/api/neal_wu"),
]

for name, url in apis:
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
        )
        r = urllib.request.urlopen(req, timeout=12)
        data = json.loads(r.read())
        keys = list(data.keys())[:6]
        print(f"OK  {name}: keys={keys}")
        # Print relevant fields
        for k in ["totalSolved", "easySolved", "mediumSolved", "hardSolved",
                  "solvedProblem", "totalQuestions", "acceptanceRate", "ranking"]:
            if k in data:
                print(f"    {k}={data[k]}")
    except Exception as e:
        print(f"FAIL {name}: {str(e)[:70]}")
    print()
