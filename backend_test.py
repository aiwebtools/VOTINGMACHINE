#!/usr/bin/env python3
"""
VoteVault Backend API Test Suite
Tests all critical backend functionality including:
- Health & Seed
- Authentication (register/login/me)
- One-vote-per-election enforcement (DB-level unique index)
- Server-side election closing
- Results visibility
- Anonymous ballot privacy
- Admin flows
- Notifications
"""

import requests
import json
import time
from datetime import datetime, timedelta

# Base URL from .env
BASE_URL = "https://ballot-counter-5.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "total": 0
}

def log_test(name, passed, details=""):
    """Log test result"""
    test_results["total"] += 1
    if passed:
        test_results["passed"].append(name)
        print(f"✅ PASS: {name}")
        if details:
            print(f"   {details}")
    else:
        test_results["failed"].append(name)
        print(f"❌ FAIL: {name}")
        if details:
            print(f"   {details}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {test_results['total']}")
    print(f"Passed: {len(test_results['passed'])}")
    print(f"Failed: {len(test_results['failed'])}")
    if test_results['failed']:
        print("\nFailed Tests:")
        for test in test_results['failed']:
            print(f"  - {test}")
    print("="*80)

# Global variables for test data
new_user_token = None
new_user_email = None
voter_token = None
admin_token = None
community_board_candidate_id = None
new_election_id = None
new_election_slug = None

print("="*80)
print("VoteVault Backend API Test Suite")
print("="*80)
print(f"Base URL: {BASE_URL}")
print(f"Started at: {datetime.now().isoformat()}")
print("="*80 + "\n")

# ============================================================================
# 1. HEALTH & SEED TESTS
# ============================================================================
print("\n### 1. HEALTH & SEED TESTS ###\n")

try:
    response = requests.get(f"{BASE_URL}/health", timeout=10)
    if response.status_code == 200 and response.json().get("ok") == True:
        log_test("Health check", True, f"Response: {response.json()}")
    else:
        log_test("Health check", False, f"Status: {response.status_code}, Body: {response.text}")
except Exception as e:
    log_test("Health check", False, f"Exception: {str(e)}")

try:
    response = requests.get(f"{BASE_URL}/elections", timeout=10)
    if response.status_code == 200:
        data = response.json()
        elections = data.get("elections", [])
        if len(elections) >= 5:
            # Check for expected elections
            slugs = [e.get("slug") for e in elections]
            expected = ["community-board-2025", "best-new-initiative", "school-association", 
                       "neighborhood-proposal", "best-local-cafe"]
            found = all(slug in slugs for slug in expected)
            if found:
                log_test("Seed data - 5 elections present", True, f"Found {len(elections)} elections")
            else:
                log_test("Seed data - 5 elections present", False, f"Missing expected elections. Found: {slugs}")
        else:
            log_test("Seed data - 5 elections present", False, f"Only {len(elections)} elections found")
    else:
        log_test("Seed data - 5 elections present", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("Seed data - 5 elections present", False, f"Exception: {str(e)}")

# ============================================================================
# 2. AUTHENTICATION TESTS
# ============================================================================
print("\n### 2. AUTHENTICATION TESTS ###\n")

# Register new user
try:
    timestamp = int(time.time())
    new_user_email = f"newuser+{timestamp}@test.app"
    payload = {
        "email": new_user_email,
        "password": "testpass123",
        "name": "Test User"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
    if response.status_code == 200:
        data = response.json()
        if "token" in data and "user" in data:
            new_user_token = data["token"]
            log_test("Register new user", True, f"User: {data['user']['email']}, Token received")
        else:
            log_test("Register new user", False, f"Missing token or user in response: {data}")
    else:
        log_test("Register new user", False, f"Status: {response.status_code}, Body: {response.text}")
except Exception as e:
    log_test("Register new user", False, f"Exception: {str(e)}")

# Login with correct credentials
try:
    payload = {"email": "voter@demo.app", "password": "voter123"}
    response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
    if response.status_code == 200:
        data = response.json()
        if "token" in data:
            voter_token = data["token"]
            log_test("Login with correct credentials", True, f"Token received for {data['user']['email']}")
        else:
            log_test("Login with correct credentials", False, f"No token in response: {data}")
    else:
        log_test("Login with correct credentials", False, f"Status: {response.status_code}, Body: {response.text}")
except Exception as e:
    log_test("Login with correct credentials", False, f"Exception: {str(e)}")

# Login with wrong password
try:
    payload = {"email": "voter@demo.app", "password": "wrongpassword"}
    response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
    if response.status_code == 401:
        log_test("Login with wrong password - expect 401", True, f"Correctly rejected with 401")
    else:
        log_test("Login with wrong password - expect 401", False, f"Status: {response.status_code}, expected 401")
except Exception as e:
    log_test("Login with wrong password - expect 401", False, f"Exception: {str(e)}")

# GET /api/auth/me with token
if new_user_token:
    try:
        headers = {"Authorization": f"Bearer {new_user_token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "user" in data:
                log_test("GET /auth/me with token", True, f"User: {data['user']['email']}")
            else:
                log_test("GET /auth/me with token", False, f"No user in response: {data}")
        else:
            log_test("GET /auth/me with token", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("GET /auth/me with token", False, f"Exception: {str(e)}")
else:
    log_test("GET /auth/me with token", False, "No token available from registration")

# GET /api/auth/me without token
try:
    response = requests.get(f"{BASE_URL}/auth/me", timeout=10)
    if response.status_code == 401:
        log_test("GET /auth/me without token - expect 401", True, "Correctly rejected with 401")
    else:
        log_test("GET /auth/me without token - expect 401", False, f"Status: {response.status_code}, expected 401")
except Exception as e:
    log_test("GET /auth/me without token - expect 401", False, f"Exception: {str(e)}")

# ============================================================================
# 3. CRITICAL: ONE-VOTE-PER-ELECTION ENFORCEMENT
# ============================================================================
print("\n### 3. CRITICAL: ONE-VOTE-PER-ELECTION ENFORCEMENT ###\n")

if new_user_token:
    # Get election details to find candidate ID
    try:
        headers = {"Authorization": f"Bearer {new_user_token}"}
        response = requests.get(f"{BASE_URL}/elections/community-board-2025", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            candidates = data.get("election", {}).get("candidates", [])
            if candidates:
                community_board_candidate_id = candidates[0]["id"]
                log_test("Get election details for voting", True, f"Found {len(candidates)} candidates")
            else:
                log_test("Get election details for voting", False, "No candidates found")
        else:
            log_test("Get election details for voting", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Get election details for voting", False, f"Exception: {str(e)}")

    # Cast first vote
    if community_board_candidate_id:
        try:
            headers = {"Authorization": f"Bearer {new_user_token}"}
            payload = {"candidate_id": community_board_candidate_id}
            response = requests.post(f"{BASE_URL}/elections/community-board-2025/vote", 
                                   json=payload, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "confirmation" in data and data.get("message") == "VOTE RECORDED":
                    log_test("Cast first vote", True, f"Confirmation: {data['confirmation']}")
                else:
                    log_test("Cast first vote", False, f"Unexpected response: {data}")
            else:
                log_test("Cast first vote", False, f"Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            log_test("Cast first vote", False, f"Exception: {str(e)}")

        # Attempt duplicate vote (same candidate)
        try:
            headers = {"Authorization": f"Bearer {new_user_token}"}
            payload = {"candidate_id": community_board_candidate_id}
            response = requests.post(f"{BASE_URL}/elections/community-board-2025/vote", 
                                   json=payload, headers=headers, timeout=10)
            if response.status_code == 409:
                data = response.json()
                if "already voted" in data.get("error", "").lower():
                    log_test("Duplicate vote - same candidate (expect 409)", True, f"Correctly rejected: {data['error']}")
                else:
                    log_test("Duplicate vote - same candidate (expect 409)", False, f"Wrong error message: {data}")
            else:
                log_test("Duplicate vote - same candidate (expect 409)", False, f"Status: {response.status_code}, expected 409")
        except Exception as e:
            log_test("Duplicate vote - same candidate (expect 409)", False, f"Exception: {str(e)}")

        # Attempt vote with different candidate (same election)
        try:
            headers = {"Authorization": f"Bearer {new_user_token}"}
            # Get second candidate if available
            response_election = requests.get(f"{BASE_URL}/elections/community-board-2025", headers=headers, timeout=10)
            if response_election.status_code == 200:
                candidates = response_election.json().get("election", {}).get("candidates", [])
                if len(candidates) > 1:
                    different_candidate_id = candidates[1]["id"]
                    payload = {"candidate_id": different_candidate_id}
                    response = requests.post(f"{BASE_URL}/elections/community-board-2025/vote", 
                                           json=payload, headers=headers, timeout=10)
                    if response.status_code == 409:
                        log_test("Duplicate vote - different candidate (expect 409)", True, "Correctly rejected with 409")
                    else:
                        log_test("Duplicate vote - different candidate (expect 409)", False, f"Status: {response.status_code}, expected 409")
                else:
                    log_test("Duplicate vote - different candidate (expect 409)", False, "Not enough candidates to test")
            else:
                log_test("Duplicate vote - different candidate (expect 409)", False, "Could not fetch election details")
        except Exception as e:
            log_test("Duplicate vote - different candidate (expect 409)", False, f"Exception: {str(e)}")
else:
    log_test("One-vote-per-election tests", False, "No token available")

# ============================================================================
# 4. CRITICAL: SERVER-SIDE ELECTION CLOSING
# ============================================================================
print("\n### 4. CRITICAL: SERVER-SIDE ELECTION CLOSING ###\n")

if new_user_token:
    # Vote on closed election
    try:
        headers = {"Authorization": f"Bearer {new_user_token}"}
        # Get a candidate from the closed election
        response = requests.get(f"{BASE_URL}/elections/best-local-cafe", headers=headers, timeout=10)
        if response.status_code == 200:
            candidates = response.json().get("election", {}).get("candidates", [])
            if candidates:
                candidate_id = candidates[0]["id"]
                payload = {"candidate_id": candidate_id}
                response = requests.post(f"{BASE_URL}/elections/best-local-cafe/vote", 
                                       json=payload, headers=headers, timeout=10)
                if response.status_code == 400:
                    error_msg = response.json().get("error", "")
                    if "VOTING CLOSED" in error_msg or "no longer accepting" in error_msg:
                        log_test("Vote on closed election - expect rejection", True, f"Correctly rejected: {error_msg}")
                    else:
                        log_test("Vote on closed election - expect rejection", False, f"Wrong error: {error_msg}")
                else:
                    log_test("Vote on closed election - expect rejection", False, f"Status: {response.status_code}, expected 400")
            else:
                log_test("Vote on closed election - expect rejection", False, "No candidates found")
        else:
            log_test("Vote on closed election - expect rejection", False, f"Could not fetch election: {response.status_code}")
    except Exception as e:
        log_test("Vote on closed election - expect rejection", False, f"Exception: {str(e)}")

    # Vote on upcoming/scheduled election
    try:
        headers = {"Authorization": f"Bearer {new_user_token}"}
        response = requests.get(f"{BASE_URL}/elections/neighborhood-proposal", headers=headers, timeout=10)
        if response.status_code == 200:
            candidates = response.json().get("election", {}).get("candidates", [])
            if candidates:
                candidate_id = candidates[0]["id"]
                payload = {"candidate_id": candidate_id}
                response = requests.post(f"{BASE_URL}/elections/neighborhood-proposal/vote", 
                                       json=payload, headers=headers, timeout=10)
                if response.status_code == 400:
                    error_msg = response.json().get("error", "")
                    if "not opened yet" in error_msg.lower():
                        log_test("Vote on upcoming election - expect rejection", True, f"Correctly rejected: {error_msg}")
                    else:
                        log_test("Vote on upcoming election - expect rejection", False, f"Wrong error: {error_msg}")
                else:
                    log_test("Vote on upcoming election - expect rejection", False, f"Status: {response.status_code}, expected 400")
            else:
                log_test("Vote on upcoming election - expect rejection", False, "No candidates found")
        else:
            log_test("Vote on upcoming election - expect rejection", False, f"Could not fetch election: {response.status_code}")
    except Exception as e:
        log_test("Vote on upcoming election - expect rejection", False, f"Exception: {str(e)}")
else:
    log_test("Server-side election closing tests", False, "No token available")

# ============================================================================
# 5. RESULTS VISIBILITY TESTS
# ============================================================================
print("\n### 5. RESULTS VISIBILITY TESTS ###\n")

if new_user_token:
    # Get results as authenticated user who voted
    try:
        headers = {"Authorization": f"Bearer {new_user_token}"}
        response = requests.get(f"{BASE_URL}/elections/community-board-2025/results", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "total_votes" in data and "candidates" in data and "last_updated" in data:
                has_percentage = all("percentage" in c for c in data["candidates"])
                if has_percentage:
                    log_test("Get results as voter who voted", True, f"Total votes: {data['total_votes']}")
                else:
                    log_test("Get results as voter who voted", False, "Missing percentage in candidates")
            else:
                log_test("Get results as voter who voted", False, f"Missing required fields: {data}")
        else:
            log_test("Get results as voter who voted", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("Get results as voter who voted", False, f"Exception: {str(e)}")
else:
    log_test("Get results as voter who voted", False, "No token available")

# Get results without auth (live_results_enabled=true, results_visibility=during_voting)
try:
    response = requests.get(f"{BASE_URL}/elections/community-board-2025/results", timeout=10)
    if response.status_code == 200:
        data = response.json()
        if "total_votes" in data and "candidates" in data:
            log_test("Get results without auth (live results enabled)", True, f"Total votes: {data['total_votes']}")
        else:
            log_test("Get results without auth (live results enabled)", False, f"Missing fields: {data}")
    else:
        log_test("Get results without auth (live results enabled)", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("Get results without auth (live results enabled)", False, f"Exception: {str(e)}")

# Get results for election with live_results_enabled=false (should fail)
try:
    response = requests.get(f"{BASE_URL}/elections/neighborhood-proposal/results", timeout=10)
    if response.status_code == 403:
        log_test("Get results for non-live election without auth - expect 403", True, "Correctly rejected with 403")
    else:
        log_test("Get results for non-live election without auth - expect 403", False, f"Status: {response.status_code}, expected 403")
except Exception as e:
    log_test("Get results for non-live election without auth - expect 403", False, f"Exception: {str(e)}")

# ============================================================================
# 6. ANONYMOUS BALLOT PRIVACY
# ============================================================================
print("\n### 6. ANONYMOUS BALLOT PRIVACY ###\n")

# This test requires direct MongoDB access - we'll document the expectation
print("NOTE: Anonymous ballot privacy requires MongoDB verification:")
print("  - For 'community-board-2025' (anonymous_ballot=true): ballot.voter_id should be null")
print("  - For 'best-new-initiative' (anonymous_ballot=false): ballot.voter_id should be present")
print("  Command: mongosh votevault --eval 'db.ballots.find({}).limit(5).toArray()'")

# We can verify the election settings are correct
try:
    response = requests.get(f"{BASE_URL}/elections/community-board-2025", timeout=10)
    if response.status_code == 200:
        election = response.json().get("election", {})
        if election.get("anonymous_ballot") == True:
            log_test("Community Board election - anonymous_ballot=true", True, "Setting verified")
        else:
            log_test("Community Board election - anonymous_ballot=true", False, f"anonymous_ballot={election.get('anonymous_ballot')}")
    else:
        log_test("Community Board election - anonymous_ballot=true", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("Community Board election - anonymous_ballot=true", False, f"Exception: {str(e)}")

try:
    response = requests.get(f"{BASE_URL}/elections/best-new-initiative", timeout=10)
    if response.status_code == 200:
        election = response.json().get("election", {})
        if election.get("anonymous_ballot") == False:
            log_test("Best New Initiative election - anonymous_ballot=false", True, "Setting verified")
        else:
            log_test("Best New Initiative election - anonymous_ballot=false", False, f"anonymous_ballot={election.get('anonymous_ballot')}")
    else:
        log_test("Best New Initiative election - anonymous_ballot=false", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("Best New Initiative election - anonymous_ballot=false", False, f"Exception: {str(e)}")

# ============================================================================
# 7. ADMIN FLOWS
# ============================================================================
print("\n### 7. ADMIN FLOWS ###\n")

# Login as admin
try:
    payload = {"email": "admin@votevault.app", "password": "admin123"}
    response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
    if response.status_code == 200:
        data = response.json()
        if data.get("user", {}).get("role") == "admin":
            admin_token = data["token"]
            log_test("Login as admin", True, f"Admin token received")
        else:
            log_test("Login as admin", False, f"User role is not admin: {data.get('user', {}).get('role')}")
    else:
        log_test("Login as admin", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("Login as admin", False, f"Exception: {str(e)}")

# GET /api/admin/elections
if admin_token:
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/admin/elections", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "elections" in data and "total_voters" in data:
                elections = data["elections"]
                has_stats = all("total_votes" in e and "participation" in e for e in elections)
                if has_stats:
                    log_test("GET /admin/elections", True, f"Found {len(elections)} elections with stats")
                else:
                    log_test("GET /admin/elections", False, "Missing stats in elections")
            else:
                log_test("GET /admin/elections", False, f"Missing required fields: {data}")
        else:
            log_test("GET /admin/elections", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("GET /admin/elections", False, f"Exception: {str(e)}")
else:
    log_test("GET /admin/elections", False, "No admin token available")

# POST /api/admin/elections (create new election)
if admin_token:
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        now = datetime.utcnow()
        ends = now + timedelta(days=1)
        payload = {
            "title": "Test Election From API",
            "description": "Automated test",
            "starts_at": now.isoformat() + "Z",
            "ends_at": ends.isoformat() + "Z",
            "live_results_enabled": True,
            "results_visibility": "during_voting",
            "anonymous_ballot": True,
            "candidates": [
                {"name": "Yes", "description": "Yes desc"},
                {"name": "No", "description": "No desc"}
            ]
        }
        response = requests.post(f"{BASE_URL}/admin/elections", json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "id" in data and "slug" in data:
                new_election_id = data["id"]
                new_election_slug = data["slug"]
                log_test("POST /admin/elections (create)", True, f"Created election: {data['slug']}")
            else:
                log_test("POST /admin/elections (create)", False, f"Unexpected response: {data}")
        else:
            log_test("POST /admin/elections (create)", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("POST /admin/elections (create)", False, f"Exception: {str(e)}")
else:
    log_test("POST /admin/elections (create)", False, "No admin token available")

# Verify new election appears in list
if new_election_slug:
    try:
        response = requests.get(f"{BASE_URL}/elections", timeout=10)
        if response.status_code == 200:
            elections = response.json().get("elections", [])
            slugs = [e.get("slug") for e in elections]
            if new_election_slug in slugs:
                log_test("New election appears in list", True, f"Found {new_election_slug}")
            else:
                log_test("New election appears in list", False, f"Slug not found in: {slugs}")
        else:
            log_test("New election appears in list", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("New election appears in list", False, f"Exception: {str(e)}")
else:
    log_test("New election appears in list", False, "No new election created")

# POST /api/admin/elections/<id>/close
if admin_token and new_election_id:
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/admin/elections/{new_election_id}/close", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                log_test("POST /admin/elections/<id>/close", True, "Election closed successfully")
            else:
                log_test("POST /admin/elections/<id>/close", False, f"Unexpected response: {data}")
        else:
            log_test("POST /admin/elections/<id>/close", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("POST /admin/elections/<id>/close", False, f"Exception: {str(e)}")
else:
    log_test("POST /admin/elections/<id>/close", False, "No admin token or election ID available")

# GET /api/admin/audit
if admin_token:
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/admin/audit", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "logs" in data:
                logs = data["logs"]
                event_types = [log.get("event_type") for log in logs]
                expected_events = ["ballot_accepted", "election_created", "election_closed", "system_seeded"]
                found_events = [e for e in expected_events if e in event_types]
                if len(found_events) >= 3:  # At least 3 of the 4 expected events
                    log_test("GET /admin/audit", True, f"Found {len(logs)} logs with events: {set(event_types)}")
                else:
                    log_test("GET /admin/audit", False, f"Missing expected events. Found: {set(event_types)}")
            else:
                log_test("GET /admin/audit", False, f"No logs in response: {data}")
        else:
            log_test("GET /admin/audit", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("GET /admin/audit", False, f"Exception: {str(e)}")
else:
    log_test("GET /admin/audit", False, "No admin token available")

# GET /api/admin/elections as non-admin (should fail)
if voter_token:
    try:
        headers = {"Authorization": f"Bearer {voter_token}"}
        response = requests.get(f"{BASE_URL}/admin/elections", headers=headers, timeout=10)
        if response.status_code == 403:
            log_test("GET /admin/elections as non-admin - expect 403", True, "Correctly rejected with 403")
        else:
            log_test("GET /admin/elections as non-admin - expect 403", False, f"Status: {response.status_code}, expected 403")
    except Exception as e:
        log_test("GET /admin/elections as non-admin - expect 403", False, f"Exception: {str(e)}")
else:
    log_test("GET /admin/elections as non-admin - expect 403", False, "No voter token available")

# ============================================================================
# 8. NOTIFICATIONS
# ============================================================================
print("\n### 8. NOTIFICATIONS ###\n")

if voter_token:
    # GET /api/notifications (should have vote_confirmation from earlier)
    try:
        headers = {"Authorization": f"Bearer {voter_token}"}
        response = requests.get(f"{BASE_URL}/notifications", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "notifications" in data:
                notifications = data["notifications"]
                log_test("GET /notifications", True, f"Found {len(notifications)} notifications")
            else:
                log_test("GET /notifications", False, f"No notifications field: {data}")
        else:
            log_test("GET /notifications", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("GET /notifications", False, f"Exception: {str(e)}")
else:
    log_test("GET /notifications", False, "No voter token available")

if new_user_token:
    # Check for vote_confirmation notification
    try:
        headers = {"Authorization": f"Bearer {new_user_token}"}
        response = requests.get(f"{BASE_URL}/notifications", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            notifications = data.get("notifications", [])
            vote_conf = [n for n in notifications if n.get("type") == "vote_confirmation"]
            if vote_conf:
                log_test("Vote confirmation notification present", True, f"Found {len(vote_conf)} vote_confirmation notifications")
            else:
                log_test("Vote confirmation notification present", False, f"No vote_confirmation found. Types: {[n.get('type') for n in notifications]}")
        else:
            log_test("Vote confirmation notification present", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Vote confirmation notification present", False, f"Exception: {str(e)}")

    # Check for new_election notification (from admin creating election)
    try:
        headers = {"Authorization": f"Bearer {new_user_token}"}
        response = requests.get(f"{BASE_URL}/notifications", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            notifications = data.get("notifications", [])
            new_election = [n for n in notifications if n.get("type") == "new_election"]
            if new_election:
                log_test("New election notification present", True, f"Found {len(new_election)} new_election notifications")
            else:
                log_test("New election notification present", False, f"No new_election found. Types: {[n.get('type') for n in notifications]}")
        else:
            log_test("New election notification present", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("New election notification present", False, f"Exception: {str(e)}")

    # POST /api/notifications/read
    try:
        headers = {"Authorization": f"Bearer {new_user_token}"}
        response = requests.post(f"{BASE_URL}/notifications/read", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                # Verify notifications are marked as read
                response2 = requests.get(f"{BASE_URL}/notifications", headers=headers, timeout=10)
                if response2.status_code == 200:
                    notifications = response2.json().get("notifications", [])
                    all_read = all(n.get("read") == True for n in notifications)
                    if all_read:
                        log_test("POST /notifications/read", True, "All notifications marked as read")
                    else:
                        log_test("POST /notifications/read", False, "Some notifications not marked as read")
                else:
                    log_test("POST /notifications/read", False, "Could not verify read status")
            else:
                log_test("POST /notifications/read", False, f"Unexpected response: {data}")
        else:
            log_test("POST /notifications/read", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        log_test("POST /notifications/read", False, f"Exception: {str(e)}")
else:
    log_test("Notifications tests", False, "No token available")

# ============================================================================
# SUMMARY
# ============================================================================
print_summary()
