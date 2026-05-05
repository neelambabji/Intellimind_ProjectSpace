import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0"
}


def get_problem_count(roll_no):
    try:
        url = "https://maya.technicalhub.io/node/api/get-student-problems-count"

        payload = {"roll_no": roll_no}

        res = requests.post(
            url,
            json=payload,
            headers=HEADERS,
            timeout=10,
            verify=False
        )

        return res.json()

    except Exception as e:
        return {"error": str(e)}


def get_problem_dashboard(roll_no):
    try:
        url = "https://maya.technicalhub.io/node/api/get-student-problems-count-dashboard"

        payload = {"roll_no": roll_no}

        res = requests.post(
            url,
            json=payload,
            headers=HEADERS,
            timeout=10,
            verify=False   # 👈 add this also
        )

        return res.json()

    except Exception as e:
        return {"error": str(e)}
    
def get_skill_tags_details(roll_no):
    try:
        url = "https://maya.technicalhub.io/node/api/get-tags-counts"

        payload = {"roll_no": roll_no}

        res = requests.post(
            url,
            json=payload,
            headers=HEADERS,
            timeout=10,
            verify=False   # 👈 add this also
        )

        return res.json()

    except Exception as e:
        return {"error": str(e)}