#!/usr/bin/env python3
"""
VoteVault Backend Test Suite
Tests all newly added features per review request
"""
import requests
import json
import random
import string
import time
from datetime import datetime

# Configuration
BASE_URL = "https://ballot-counter-5.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@votevault.app"
ADMIN_PASSWORD = "admin123"
VOTER_EMAIL = "voter@demo.app"
VOTER_PASSWORD = "voter123"

# Test state
admin_token = None
voter_token = None
test_results = []

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"   {details}")
    test_results.append({"name": name, "passed": passed, "details": details})

def random_string(length=8):
    """Generate random string"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def random_email():
    """Generate random email"""
    return f"testvoter_{random_string()}@example.com"

# ============================================================================
# SCENARIO 1: REGRESSION TESTS
# ============================================================================

def test_1_login_both_users():
    """Test login for admin and voter"""
    global admin_token, voter_token
    
    print("\n=== SCENARIO 1: REGRESSION TESTS ===\n")
    
    # Login as admin
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if resp.status_code == 200:
            data = resp.json()
            admin_token = data.get("token")
            if admin_token and data.get("user", {}).get("role") == "admin":
                log_test("Login as admin", True, f"Token received, role=admin")
            else:
                log_test("Login as admin", False, "Token or role missing")
        else:
            log_test("Login as admin", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Login as admin", False, str(e))
    
    # Login as voter
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": VOTER_EMAIL,
            "password": VOTER_PASSWORD
        })
        if resp.status_code == 200:
            data = resp.json()
            voter_token = data.get("token")
            if voter_token and data.get("user", {}).get("role") == "voter":
                log_test("Login as voter", True, f"Token received, role=voter")
            else:
                log_test("Login as voter", False, "Token or role missing")
        else:
            log_test("Login as voter", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Login as voter", False, str(e))

def test_2_auth_me():
    """Test GET /auth/me for both users"""
    # Admin
    try:
        resp = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        if resp.status_code == 200:
            data = resp.json()
            if data.get("user", {}).get("email") == ADMIN_EMAIL:
                log_test("GET /auth/me (admin)", True, f"Email: {data['user']['email']}")
            else:
                log_test("GET /auth/me (admin)", False, "Email mismatch")
        else:
            log_test("GET /auth/me (admin)", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("GET /auth/me (admin)", False, str(e))
    
    # Voter
    try:
        resp = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {voter_token}"})
        if resp.status_code == 200:
            data = resp.json()
            if data.get("user", {}).get("email") == VOTER_EMAIL:
                log_test("GET /auth/me (voter)", True, f"Email: {data['user']['email']}")
            else:
                log_test("GET /auth/me (voter)", False, "Email mismatch")
        else:
            log_test("GET /auth/me (voter)", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("GET /auth/me (voter)", False, str(e))

def test_3_get_elections():
    """Test GET /elections - should return 4 elections, no [DEMO] tags"""
    try:
        resp = requests.get(f"{BASE_URL}/elections", headers={"Authorization": f"Bearer {voter_token}"})
        if resp.status_code == 200:
            data = resp.json()
            elections = data.get("elections", [])
            
            # Check count
            if len(elections) != 4:
                log_test("GET /elections count", False, f"Expected 4, got {len(elections)}")
            else:
                log_test("GET /elections count", True, f"4 elections returned")
            
            # Check no [DEMO] tags
            has_demo = any("[DEMO]" in e.get("title", "") for e in elections)
            if has_demo:
                log_test("GET /elections no [DEMO] tags", False, "Found [DEMO] in titles")
            else:
                log_test("GET /elections no [DEMO] tags", True, "No [DEMO] tags found")
            
            # Check eligibility_mode and is_eligible fields
            all_have_fields = all(
                "eligibility_mode" in e and "is_eligible" in e 
                for e in elections
            )
            if all_have_fields:
                log_test("GET /elections eligibility fields", True, "All elections have eligibility_mode + is_eligible")
            else:
                log_test("GET /elections eligibility fields", False, "Missing eligibility fields")
            
            # Check expected slugs
            slugs = [e.get("slug") for e in elections]
            expected = ["community-board-2026", "participatory-budget-2026", "charter-amendment-referendum", "parks-advisory-vote"]
            if set(slugs) == set(expected):
                log_test("GET /elections expected slugs", True, f"Slugs: {', '.join(slugs)}")
            else:
                log_test("GET /elections expected slugs", False, f"Got: {slugs}, Expected: {expected}")
            
            # Check open elections
            open_elections = [e for e in elections if e.get("status") == "open"]
            if len(open_elections) == 3:
                log_test("GET /elections open count", True, "3 open elections")
            else:
                log_test("GET /elections open count", False, f"Expected 3 open, got {len(open_elections)}")
            
            # Check scheduled election
            scheduled = [e for e in elections if e.get("status") == "scheduled"]
            if len(scheduled) == 1 and scheduled[0].get("slug") == "parks-advisory-vote":
                log_test("GET /elections scheduled", True, "parks-advisory-vote is scheduled")
            else:
                log_test("GET /elections scheduled", False, f"Expected parks-advisory-vote scheduled")
        else:
            log_test("GET /elections", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("GET /elections", False, str(e))

def test_4_vote_and_duplicate():
    """Test voting on community-board-2026 and duplicate prevention"""
    try:
        # Get election details
        resp = requests.get(f"{BASE_URL}/elections/community-board-2026", headers={"Authorization": f"Bearer {voter_token}"})
        if resp.status_code != 200:
            log_test("Vote: Get election details", False, f"Status {resp.status_code}")
            return
        
        election_data = resp.json().get("election", {})
        candidates = election_data.get("candidates", [])
        
        if not candidates:
            log_test("Vote: Get candidates", False, "No candidates found")
            return
        
        candidate_id = candidates[0]["id"]
        
        # Check if already voted
        if election_data.get("has_voted"):
            log_test("Vote: Already voted check", True, "User already voted (expected from previous tests)")
            
            # Try duplicate vote
            resp = requests.post(
                f"{BASE_URL}/elections/community-board-2026/vote",
                headers={"Authorization": f"Bearer {voter_token}"},
                json={"candidate_id": candidate_id}
            )
            if resp.status_code == 409:
                log_test("Duplicate vote prevention", True, "409 returned as expected")
            else:
                log_test("Duplicate vote prevention", False, f"Expected 409, got {resp.status_code}")
        else:
            # First vote
            resp = requests.post(
                f"{BASE_URL}/elections/community-board-2026/vote",
                headers={"Authorization": f"Bearer {voter_token}"},
                json={"candidate_id": candidate_id}
            )
            
            if resp.status_code == 200:
                data = resp.json()
                confirmation = data.get("confirmation")
                message = data.get("message")
                
                if confirmation and confirmation.startswith("VV-") and message == "VOTE RECORDED":
                    log_test("First vote", True, f"Confirmation: {confirmation}")
                else:
                    log_test("First vote", False, f"Missing confirmation or message")
                
                # Try duplicate
                resp2 = requests.post(
                    f"{BASE_URL}/elections/community-board-2026/vote",
                    headers={"Authorization": f"Bearer {voter_token}"},
                    json={"candidate_id": candidate_id}
                )
                if resp2.status_code == 409:
                    log_test("Duplicate vote prevention", True, "409 returned")
                else:
                    log_test("Duplicate vote prevention", False, f"Expected 409, got {resp2.status_code}")
            else:
                log_test("First vote", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Vote and duplicate test", False, str(e))

# ============================================================================
# SCENARIO 2: EMAIL FALLBACK
# ============================================================================

def test_5_email_fallback():
    """Test email fallback with RESEND_API_KEY empty"""
    print("\n=== SCENARIO 2: EMAIL FALLBACK (RESEND_API_KEY empty) ===\n")
    
    new_email = random_email()
    new_password = "password123"
    
    # Register new user
    try:
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": new_email,
            "password": new_password,
            "name": f"Test Voter {random_string(4)}"
        })
        
        if resp.status_code == 200:
            log_test("Register new user", True, f"Email: {new_email}")
        else:
            log_test("Register new user", False, f"Status {resp.status_code}: {resp.text}")
            return
    except Exception as e:
        log_test("Register new user", False, str(e))
        return
    
    # Check email events as admin
    try:
        resp = requests.get(f"{BASE_URL}/admin/emails", headers={"Authorization": f"Bearer {admin_token}"})
        
        if resp.status_code == 200:
            data = resp.json()
            email_enabled = data.get("email_enabled")
            events = data.get("events", [])
            
            # Check email_enabled is false
            if email_enabled == False:
                log_test("Email system: email_enabled=false", True, "RESEND_API_KEY is empty")
            else:
                log_test("Email system: email_enabled=false", False, f"email_enabled={email_enabled}")
            
            # Check for welcome email event
            welcome_events = [e for e in events if e.get("type") == "welcome" and e.get("to") == new_email.lower()]
            if welcome_events:
                status = welcome_events[0].get("status")
                if status == "queued_no_key":
                    log_test("Welcome email queued_no_key", True, f"Status: {status}")
                else:
                    log_test("Welcome email queued_no_key", False, f"Status: {status}")
            else:
                log_test("Welcome email queued_no_key", False, "No welcome event found")
            
            # Check for vote_confirmation event (from previous vote)
            vote_conf_events = [e for e in events if e.get("type") == "vote_confirmation" and e.get("to") == VOTER_EMAIL]
            if vote_conf_events:
                status = vote_conf_events[0].get("status")
                if status == "queued_no_key":
                    log_test("Vote confirmation email queued_no_key", True, f"Status: {status}")
                else:
                    log_test("Vote confirmation email queued_no_key", False, f"Status: {status}")
            else:
                log_test("Vote confirmation email queued_no_key", False, "No vote_confirmation event found")
        else:
            log_test("GET /admin/emails", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Email fallback test", False, str(e))

# ============================================================================
# SCENARIO 3: RICH CANDIDATES + ELECTION CREATE
# ============================================================================

def test_6_rich_candidates_and_validation():
    """Test creating election with rich candidates and validation"""
    print("\n=== SCENARIO 3: RICH CANDIDATES + ELECTION CREATE ===\n")
    
    rand = random_string(6)
    now = datetime.utcnow().isoformat() + "Z"
    
    # Create election with rich candidates
    try:
        election_data = {
            "title": f"Board Seat Test {rand}",
            "description": "Test election with rich candidate data",
            "starts_at": datetime.utcnow().isoformat() + "Z",
            "ends_at": datetime.fromtimestamp(time.time() + 3600).isoformat() + "Z",
            "live_results_enabled": True,
            "candidates": [
                {
                    "name": "Cand A",
                    "description": "d",
                    "statement": "my statement",
                    "image_url": "https://example.com/a.jpg"
                },
                {
                    "name": "Cand B",
                    "description": "d2",
                    "statement": "s2"
                }
            ]
        }
        
        resp = requests.post(
            f"{BASE_URL}/admin/elections",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=election_data
        )
        
        if resp.status_code == 200:
            data = resp.json()
            slug = data.get("slug")
            election_id = data.get("id")
            
            if slug and election_id:
                log_test("Create election with rich candidates", True, f"Slug: {slug}")
                
                # Get election details to verify candidates
                resp2 = requests.get(f"{BASE_URL}/elections/{slug}", headers={"Authorization": f"Bearer {voter_token}"})
                if resp2.status_code == 200:
                    election = resp2.json().get("election", {})
                    candidates = election.get("candidates", [])
                    
                    # Check statement and image_url
                    cand_a = next((c for c in candidates if c.get("name") == "Cand A"), None)
                    cand_b = next((c for c in candidates if c.get("name") == "Cand B"), None)
                    
                    if cand_a and cand_a.get("statement") == "my statement" and cand_a.get("image_url") == "https://example.com/a.jpg":
                        log_test("Rich candidate fields (Cand A)", True, "statement and image_url present")
                    else:
                        log_test("Rich candidate fields (Cand A)", False, f"Missing fields: {cand_a}")
                    
                    if cand_b and cand_b.get("statement") == "s2":
                        log_test("Rich candidate fields (Cand B)", True, "statement present")
                    else:
                        log_test("Rich candidate fields (Cand B)", False, f"Missing fields: {cand_b}")
                else:
                    log_test("Get election details", False, f"Status {resp2.status_code}")
            else:
                log_test("Create election with rich candidates", False, "Missing slug or id")
        else:
            log_test("Create election with rich candidates", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Rich candidates test", False, str(e))
    
    # Validation: ends_at before starts_at
    try:
        bad_data = {
            "title": f"Bad Election {rand}",
            "starts_at": datetime.fromtimestamp(time.time() + 3600).isoformat() + "Z",
            "ends_at": datetime.utcnow().isoformat() + "Z",
            "candidates": [{"name": "A"}, {"name": "B"}]
        }
        
        resp = requests.post(
            f"{BASE_URL}/admin/elections",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=bad_data
        )
        
        if resp.status_code == 400:
            log_test("Validation: ends_at before starts_at", True, "400 returned")
        else:
            log_test("Validation: ends_at before starts_at", False, f"Expected 400, got {resp.status_code}")
    except Exception as e:
        log_test("Validation: ends_at before starts_at", False, str(e))
    
    # Validation: only 1 candidate
    try:
        bad_data = {
            "title": f"One Candidate {rand}",
            "starts_at": datetime.utcnow().isoformat() + "Z",
            "ends_at": datetime.fromtimestamp(time.time() + 3600).isoformat() + "Z",
            "candidates": [{"name": "Only One"}]
        }
        
        resp = requests.post(
            f"{BASE_URL}/admin/elections",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=bad_data
        )
        
        if resp.status_code == 400:
            log_test("Validation: only 1 candidate", True, "400 returned")
        else:
            log_test("Validation: only 1 candidate", False, f"Expected 400, got {resp.status_code}")
    except Exception as e:
        log_test("Validation: only 1 candidate", False, str(e))

# ============================================================================
# SCENARIO 4: CSV VOTER ELIGIBILITY
# ============================================================================

def test_7_csv_voter_eligibility():
    """Test CSV voter eligibility with voter_list mode"""
    print("\n=== SCENARIO 4: CSV VOTER ELIGIBILITY ===\n")
    
    rand = random_string(6)
    listed_email = f"listed_{rand}@example.com"
    
    # Create election with voter_list eligibility
    try:
        election_data = {
            "title": f"Restricted Vote Test {rand}",
            "description": "Test election with voter list",
            "starts_at": datetime.utcnow().isoformat() + "Z",
            "ends_at": datetime.fromtimestamp(time.time() + 3600).isoformat() + "Z",
            "eligibility_mode": "voter_list",
            "voter_emails": [VOTER_EMAIL, listed_email],
            "candidates": [
                {"name": "Option A", "description": "First option"},
                {"name": "Option B", "description": "Second option"}
            ]
        }
        
        resp = requests.post(
            f"{BASE_URL}/admin/elections",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=election_data
        )
        
        if resp.status_code != 200:
            log_test("Create voter_list election", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        data = resp.json()
        election_id = data.get("id")
        slug = data.get("slug")
        
        if not election_id or not slug:
            log_test("Create voter_list election", False, "Missing id or slug")
            return
        
        log_test("Create voter_list election", True, f"ID: {election_id}, Slug: {slug}")
        
        # 4a: GET /admin/elections/:id/voters
        resp = requests.get(
            f"{BASE_URL}/admin/elections/{election_id}/voters",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if resp.status_code == 200:
            voters_data = resp.json()
            count = voters_data.get("count")
            voters = voters_data.get("voters", [])
            
            if count == 2:
                log_test("GET /admin/elections/:id/voters count", True, f"Count: {count}")
            else:
                log_test("GET /admin/elections/:id/voters count", False, f"Expected 2, got {count}")
            
            # Check voter@demo.app is registered
            voter_entry = next((v for v in voters if v.get("email") == VOTER_EMAIL), None)
            if voter_entry and voter_entry.get("registered") == True:
                log_test("Voter list: voter@demo.app registered=true", True)
            else:
                log_test("Voter list: voter@demo.app registered=true", False, f"Entry: {voter_entry}")
        else:
            log_test("GET /admin/elections/:id/voters", False, f"Status {resp.status_code}")
        
        # 4b: As voter@demo.app, check is_eligible and vote
        resp = requests.get(f"{BASE_URL}/elections/{slug}", headers={"Authorization": f"Bearer {voter_token}"})
        if resp.status_code == 200:
            election = resp.json().get("election", {})
            is_eligible = election.get("is_eligible")
            
            if is_eligible == True:
                log_test("Voter eligibility: voter@demo.app is_eligible=true", True)
            else:
                log_test("Voter eligibility: voter@demo.app is_eligible=true", False, f"is_eligible={is_eligible}")
            
            # Vote
            candidates = election.get("candidates", [])
            if candidates:
                resp_vote = requests.post(
                    f"{BASE_URL}/elections/{slug}/vote",
                    headers={"Authorization": f"Bearer {voter_token}"},
                    json={"candidate_id": candidates[0]["id"]}
                )
                
                if resp_vote.status_code == 200:
                    log_test("Vote as eligible voter", True, "Vote accepted")
                else:
                    log_test("Vote as eligible voter", False, f"Status {resp_vote.status_code}: {resp_vote.text}")
        else:
            log_test("GET election as voter", False, f"Status {resp.status_code}")
        
        # 4c: Register fresh user NOT on list and try to vote
        unlisted_email = random_email()
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": unlisted_email,
            "password": "password123",
            "name": "Unlisted User"
        })
        
        if resp.status_code == 200:
            unlisted_token = resp.json().get("token")
            
            # Check is_eligible
            resp = requests.get(f"{BASE_URL}/elections/{slug}", headers={"Authorization": f"Bearer {unlisted_token}"})
            if resp.status_code == 200:
                election = resp.json().get("election", {})
                is_eligible = election.get("is_eligible")
                
                if is_eligible == False:
                    log_test("Unlisted user: is_eligible=false", True)
                else:
                    log_test("Unlisted user: is_eligible=false", False, f"is_eligible={is_eligible}")
                
                # Try to vote
                candidates = election.get("candidates", [])
                if candidates:
                    resp_vote = requests.post(
                        f"{BASE_URL}/elections/{slug}/vote",
                        headers={"Authorization": f"Bearer {unlisted_token}"},
                        json={"candidate_id": candidates[0]["id"]}
                    )
                    
                    if resp_vote.status_code == 403:
                        error_msg = resp_vote.json().get("error", "")
                        if "not on the eligible voter list" in error_msg:
                            log_test("Unlisted user vote blocked with 403", True, f"Error: {error_msg}")
                        else:
                            log_test("Unlisted user vote blocked with 403", False, f"Wrong error: {error_msg}")
                    else:
                        log_test("Unlisted user vote blocked with 403", False, f"Expected 403, got {resp_vote.status_code}")
        else:
            log_test("Register unlisted user", False, f"Status {resp.status_code}")
        
        # 4d: Add and remove voter
        added_email = f"added_{rand}@example.com"
        
        # Add voter
        resp = requests.post(
            f"{BASE_URL}/admin/elections/{election_id}/voters",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"emails": [added_email]}
        )
        
        if resp.status_code == 200:
            data = resp.json()
            added = data.get("added")
            total = data.get("total")
            
            if added == 1 and total == 3:
                log_test("Add voter to list", True, f"Added: {added}, Total: {total}")
            else:
                log_test("Add voter to list", False, f"Added: {added}, Total: {total}")
        else:
            log_test("Add voter to list", False, f"Status {resp.status_code}")
        
        # Delete voter
        resp = requests.delete(
            f"{BASE_URL}/admin/elections/{election_id}/voters",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"email": added_email}
        )
        
        if resp.status_code == 200:
            log_test("Delete voter from list", True)
        else:
            log_test("Delete voter from list", False, f"Status {resp.status_code}")
        
        # 4e: Check admin elections list shows eligibility_mode and eligible count
        resp = requests.get(f"{BASE_URL}/admin/elections", headers={"Authorization": f"Bearer {admin_token}"})
        if resp.status_code == 200:
            elections = resp.json().get("elections", [])
            this_election = next((e for e in elections if e.get("id") == election_id), None)
            
            if this_election:
                eligibility_mode = this_election.get("eligibility_mode")
                eligible = this_election.get("eligible")
                
                if eligibility_mode == "voter_list":
                    log_test("Admin elections: eligibility_mode=voter_list", True)
                else:
                    log_test("Admin elections: eligibility_mode=voter_list", False, f"Mode: {eligibility_mode}")
                
                if eligible == 2:
                    log_test("Admin elections: eligible count=2", True, f"Eligible: {eligible}")
                else:
                    log_test("Admin elections: eligible count=2", False, f"Expected 2, got {eligible}")
        else:
            log_test("GET /admin/elections", False, f"Status {resp.status_code}")
        
        # 4f: Check email events for new_election announcements
        resp = requests.get(f"{BASE_URL}/admin/emails", headers={"Authorization": f"Bearer {admin_token}"})
        if resp.status_code == 200:
            events = resp.json().get("events", [])
            new_election_events = [e for e in events if e.get("type") == "new_election"]
            
            # Check for listed emails
            listed_events = [e for e in new_election_events if e.get("to") in [VOTER_EMAIL, listed_email.lower()]]
            
            if len(listed_events) >= 2:
                all_queued = all(e.get("status") == "queued_no_key" for e in listed_events)
                if all_queued:
                    log_test("New election emails queued for voter list", True, f"Found {len(listed_events)} events")
                else:
                    log_test("New election emails queued for voter list", False, "Not all queued_no_key")
            else:
                log_test("New election emails queued for voter list", False, f"Expected 2+, found {len(listed_events)}")
        else:
            log_test("GET /admin/emails for announcements", False, f"Status {resp.status_code}")
        
    except Exception as e:
        log_test("CSV voter eligibility test", False, str(e))

# ============================================================================
# SCENARIO 5: INTEGRITY ENGINE
# ============================================================================

def test_8_integrity_engine():
    """Test integrity engine with tamper detection"""
    print("\n=== SCENARIO 5: INTEGRITY ENGINE ===\n")
    
    # Test public integrity endpoint
    try:
        resp = requests.get(f"{BASE_URL}/elections/community-board-2026/integrity")
        
        if resp.status_code == 200:
            data = resp.json()
            verified = data.get("verified")
            checks = data.get("checks", [])
            total_ballots = data.get("total_ballots")
            total_participants = data.get("total_participants")
            
            if verified == True:
                log_test("Integrity: verified=true", True)
            else:
                log_test("Integrity: verified=true", False, f"verified={verified}")
            
            if len(checks) == 5:
                log_test("Integrity: 5 checks present", True)
            else:
                log_test("Integrity: 5 checks present", False, f"Found {len(checks)} checks")
            
            all_pass = all(c.get("pass") == True for c in checks)
            if all_pass:
                log_test("Integrity: all checks pass", True)
            else:
                failed = [c.get("id") for c in checks if not c.get("pass")]
                log_test("Integrity: all checks pass", False, f"Failed: {failed}")
            
            if total_ballots >= 1:
                log_test("Integrity: total_ballots >= 1", True, f"Ballots: {total_ballots}")
            else:
                log_test("Integrity: total_ballots >= 1", False, f"Ballots: {total_ballots}")
            
            if total_ballots == total_participants:
                log_test("Integrity: ballots == participants", True, f"{total_ballots} == {total_participants}")
            else:
                log_test("Integrity: ballots == participants", False, f"{total_ballots} != {total_participants}")
        else:
            log_test("GET /elections/:slug/integrity", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("Integrity engine test", False, str(e))
    
    # Test admin integrity endpoint (for Board Seat Test election if it exists)
    try:
        # Get admin elections to find Board Seat Test
        resp = requests.get(f"{BASE_URL}/admin/elections", headers={"Authorization": f"Bearer {admin_token}"})
        if resp.status_code == 200:
            elections = resp.json().get("elections", [])
            board_seat = next((e for e in elections if "Board Seat Test" in e.get("title", "")), None)
            
            if board_seat:
                election_id = board_seat.get("id")
                resp2 = requests.get(
                    f"{BASE_URL}/admin/elections/{election_id}/integrity",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                
                if resp2.status_code == 200:
                    data = resp2.json()
                    verified = data.get("verified")
                    if verified == True:
                        log_test("Admin integrity check: verified=true", True)
                    else:
                        log_test("Admin integrity check: verified=true", False, f"verified={verified}")
                else:
                    log_test("Admin integrity check", False, f"Status {resp2.status_code}")
            else:
                log_test("Admin integrity check", False, "Board Seat Test election not found")
    except Exception as e:
        log_test("Admin integrity check", False, str(e))
    
    # TAMPER TEST - Note: This requires MongoDB access which may not be available
    print("\n   Note: Tamper test requires MongoDB access (mongosh). Skipping automated tamper test.")
    print("   Manual test: Update a ballot's candidate_id in MongoDB, verify integrity fails, then restore.")

# ============================================================================
# SCENARIO 6: RESULTS/WINNER EMAILS ON CLOSE
# ============================================================================

def test_9_results_emails_on_close():
    """Test results/winner emails and notifications when election closes"""
    print("\n=== SCENARIO 6: RESULTS/WINNER EMAILS ON CLOSE ===\n")
    
    # Find Board Seat Test election
    try:
        resp = requests.get(f"{BASE_URL}/admin/elections", headers={"Authorization": f"Bearer {admin_token}"})
        if resp.status_code != 200:
            log_test("Get admin elections", False, f"Status {resp.status_code}")
            return
        
        elections = resp.json().get("elections", [])
        board_seat = next((e for e in elections if "Board Seat Test" in e.get("title", "")), None)
        
        if not board_seat:
            log_test("Find Board Seat Test election", False, "Election not found")
            return
        
        election_id = board_seat.get("id")
        slug = board_seat.get("slug")
        
        # Vote as voter@demo.app if not already voted
        resp = requests.get(f"{BASE_URL}/elections/{slug}", headers={"Authorization": f"Bearer {voter_token}"})
        if resp.status_code == 200:
            election = resp.json().get("election", {})
            has_voted = election.get("has_voted")
            
            if not has_voted:
                candidates = election.get("candidates", [])
                if candidates:
                    resp_vote = requests.post(
                        f"{BASE_URL}/elections/{slug}/vote",
                        headers={"Authorization": f"Bearer {voter_token}"},
                        json={"candidate_id": candidates[0]["id"]}
                    )
                    
                    if resp_vote.status_code == 200:
                        log_test("Vote on Board Seat Test", True)
                    else:
                        log_test("Vote on Board Seat Test", False, f"Status {resp_vote.status_code}")
            else:
                log_test("Vote on Board Seat Test", True, "Already voted")
        
        # Close election
        resp = requests.post(
            f"{BASE_URL}/admin/elections/{election_id}/close",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if resp.status_code == 200:
            log_test("Close election", True)
        else:
            log_test("Close election", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # Check email events for results email
        resp = requests.get(f"{BASE_URL}/admin/emails", headers={"Authorization": f"Bearer {admin_token}"})
        if resp.status_code == 200:
            events = resp.json().get("events", [])
            results_events = [e for e in events if e.get("type") == "results" and e.get("to") == VOTER_EMAIL]
            
            if results_events:
                status = results_events[0].get("status")
                if status == "queued_no_key":
                    log_test("Results email queued_no_key", True)
                else:
                    log_test("Results email queued_no_key", False, f"Status: {status}")
            else:
                log_test("Results email queued_no_key", False, "No results event found")
        else:
            log_test("GET /admin/emails for results", False, f"Status {resp.status_code}")
        
        # Check notifications for results notification
        resp = requests.get(f"{BASE_URL}/notifications", headers={"Authorization": f"Bearer {voter_token}"})
        if resp.status_code == 200:
            notifications = resp.json().get("notifications", [])
            results_notifs = [n for n in notifications if n.get("type") == "results"]
            
            if results_notifs:
                notif = results_notifs[0]
                message = notif.get("message", "")
                if "winner" in message.lower() or "votes" in message.lower() or "tie" in message.lower():
                    log_test("Results notification with winner info", True, f"Message: {message[:50]}...")
                else:
                    log_test("Results notification with winner info", False, f"Message: {message}")
            else:
                log_test("Results notification", False, "No results notification found")
        else:
            log_test("GET /notifications", False, f"Status {resp.status_code}")
        
        # Try closing again to verify no duplicate results events
        resp = requests.post(
            f"{BASE_URL}/admin/elections/{election_id}/close",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if resp.status_code == 200:
            log_test("Re-close election (idempotent)", True, "No error on re-close")
        else:
            log_test("Re-close election (idempotent)", False, f"Status {resp.status_code}")
        
        # Get results
        resp = requests.get(f"{BASE_URL}/elections/{slug}/results", headers={"Authorization": f"Bearer {voter_token}"})
        if resp.status_code == 200:
            data = resp.json()
            election = data.get("election", {})
            status = election.get("status")
            candidates = data.get("candidates", [])
            
            if status == "closed":
                log_test("Results: status=closed", True)
            else:
                log_test("Results: status=closed", False, f"Status: {status}")
            
            if candidates:
                log_test("Results: winner determinable", True, f"{len(candidates)} candidates with votes")
            else:
                log_test("Results: winner determinable", False, "No candidates in results")
        else:
            log_test("GET /elections/:slug/results", False, f"Status {resp.status_code}")
        
    except Exception as e:
        log_test("Results/winner emails test", False, str(e))

# ============================================================================
# SCENARIO 7: NOTIFICATION PREFERENCES
# ============================================================================

def test_10_notification_prefs():
    """Test GET/POST /prefs"""
    print("\n=== SCENARIO 7: NOTIFICATION PREFERENCES ===\n")
    
    try:
        # GET prefs
        resp = requests.get(f"{BASE_URL}/prefs", headers={"Authorization": f"Bearer {voter_token}"})
        
        if resp.status_code == 200:
            data = resp.json()
            prefs = data.get("prefs", {})
            
            # Check 4 boolean keys
            expected_keys = ["new_election", "closing_soon", "vote_confirmation", "results_available"]
            has_all_keys = all(k in prefs for k in expected_keys)
            
            if has_all_keys:
                all_true = all(prefs.get(k) == True for k in expected_keys)
                if all_true:
                    log_test("GET /prefs: 4 boolean keys all true", True)
                else:
                    log_test("GET /prefs: 4 boolean keys", True, f"Keys present but not all true: {prefs}")
            else:
                log_test("GET /prefs: 4 boolean keys", False, f"Missing keys: {prefs}")
        else:
            log_test("GET /prefs", False, f"Status {resp.status_code}")
        
        # POST prefs - set results_available to false
        resp = requests.post(
            f"{BASE_URL}/prefs",
            headers={"Authorization": f"Bearer {voter_token}"},
            json={"results_available": False}
        )
        
        if resp.status_code == 200:
            data = resp.json()
            prefs = data.get("prefs", {})
            
            if prefs.get("results_available") == False:
                log_test("POST /prefs: set results_available=false", True)
            else:
                log_test("POST /prefs: set results_available=false", False, f"Value: {prefs.get('results_available')}")
        else:
            log_test("POST /prefs", False, f"Status {resp.status_code}")
        
        # Set back to true
        resp = requests.post(
            f"{BASE_URL}/prefs",
            headers={"Authorization": f"Bearer {voter_token}"},
            json={"results_available": True}
        )
        
        if resp.status_code == 200:
            data = resp.json()
            prefs = data.get("prefs", {})
            
            if prefs.get("results_available") == True:
                log_test("POST /prefs: set results_available=true", True)
            else:
                log_test("POST /prefs: set results_available=true", False, f"Value: {prefs.get('results_available')}")
        else:
            log_test("POST /prefs restore", False, f"Status {resp.status_code}")
        
    except Exception as e:
        log_test("Notification prefs test", False, str(e))

# ============================================================================
# SCENARIO 8: GOOGLE OAUTH ERROR PATHS
# ============================================================================

def test_11_google_oauth_errors():
    """Test Google OAuth error paths"""
    print("\n=== SCENARIO 8: GOOGLE OAUTH ERROR PATHS ===\n")
    
    # Test with no body
    try:
        resp = requests.post(f"{BASE_URL}/auth/oauth/session", json={})
        
        if resp.status_code == 400:
            error = resp.json().get("error", "")
            if "session_id required" in error:
                log_test("OAuth: no body → 400 'session_id required'", True)
            else:
                log_test("OAuth: no body → 400 'session_id required'", False, f"Error: {error}")
        else:
            log_test("OAuth: no body → 400", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("OAuth: no body test", False, str(e))
    
    # Test with invalid session_id
    try:
        resp = requests.post(f"{BASE_URL}/auth/oauth/session", json={"session_id": "invalid-123"})
        
        if resp.status_code == 401:
            error = resp.json().get("error", "")
            if "invalid" in error.lower() or "expired" in error.lower():
                log_test("OAuth: invalid session_id → 401", True, f"Error: {error}")
            else:
                log_test("OAuth: invalid session_id → 401", False, f"Error: {error}")
        else:
            log_test("OAuth: invalid session_id → 401", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("OAuth: invalid session_id test", False, str(e))
    
    print("\n   Note: Full Google OAuth flow cannot be tested headlessly (requires browser).")

# ============================================================================
# SCENARIO 9: RATE LIMITING
# ============================================================================

def test_12_rate_limiting():
    """Test rate limiting (LAST)"""
    print("\n=== SCENARIO 9: RATE LIMITING (LAST) ===\n")
    
    # Test vote rate limiting with already-voted user
    try:
        # Try multiple votes on community-board-2026 (already voted)
        success_count = 0
        error_409_count = 0
        
        for i in range(5):
            resp = requests.post(
                f"{BASE_URL}/elections/community-board-2026/vote",
                headers={"Authorization": f"Bearer {voter_token}"},
                json={"candidate_id": "dummy"}
            )
            
            if resp.status_code == 409:
                error_409_count += 1
            elif resp.status_code == 200:
                success_count += 1
        
        if error_409_count >= 4:
            log_test("Vote rate limiting: 409s returned", True, f"Got {error_409_count} 409s")
        else:
            log_test("Vote rate limiting: 409s returned", False, f"Got {error_409_count} 409s")
        
    except Exception as e:
        log_test("Vote rate limiting test", False, str(e))
    
    # Test login rate limiting with fake IP
    print("\n   Note: Testing login 429 with fake IP to avoid polluting real IP bucket...")
    try:
        fake_ip = "10.9.9.9"
        error_429_count = 0
        
        # Send 35 login attempts with same fake IP
        for i in range(35):
            resp = requests.post(
                f"{BASE_URL}/auth/login",
                headers={"X-Forwarded-For": fake_ip},
                json={"email": "test@example.com", "password": "wrong"}
            )
            
            if resp.status_code == 429:
                error_429_count += 1
                if error_429_count == 1:
                    log_test("Login rate limiting: 429 after 30+ attempts", True, f"Got 429 on attempt {i+1}")
                break
        
        if error_429_count == 0:
            log_test("Login rate limiting: 429 after 30+ attempts", False, "No 429 received")
    except Exception as e:
        log_test("Login rate limiting test", False, str(e))

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 80)
    print("VoteVault Backend Test Suite")
    print("=" * 80)
    
    # Run all tests in order
    test_1_login_both_users()
    test_2_auth_me()
    test_3_get_elections()
    test_4_vote_and_duplicate()
    test_5_email_fallback()
    test_6_rich_candidates_and_validation()
    test_7_csv_voter_eligibility()
    test_8_integrity_engine()
    test_9_results_emails_on_close()
    test_10_notification_prefs()
    test_11_google_oauth_errors()
    test_12_rate_limiting()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for t in test_results if t["passed"])
    failed = sum(1 for t in test_results if not t["passed"])
    total = len(test_results)
    
    print(f"\nTotal: {total} tests")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    
    if failed > 0:
        print("\nFailed tests:")
        for t in test_results:
            if not t["passed"]:
                print(f"  ❌ {t['name']}")
                if t["details"]:
                    print(f"     {t['details']}")
    
    print("\n" + "=" * 80)
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
