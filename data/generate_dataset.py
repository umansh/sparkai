import csv
import random
import uuid
from datetime import datetime, timedelta
import os

def generate_classroom_dataset(output_path: str = "student_responses.csv"):
    # Seed specifically for uniqueness per Part 0 instructions (Umang / SparkSchool)
    seed_string = "Umang_SparkSchool_Founding_Engineer_202607"
    random.seed(seed_string)
    
    skills = [
        {"skill_id": "skill_arithmetic_01", "name": "Basic Arithmetic", "difficulty": 0.2},
        {"skill_id": "skill_algebra_01", "name": "Linear Equations", "difficulty": 0.5},
        {"skill_id": "skill_geometry_01", "name": "Triangles & Angles", "difficulty": 0.6},
        {"skill_id": "skill_word_problems_01", "name": "Multi-Step Word Problems", "difficulty": 0.8}
    ]
    
    # We will generate 60 students (`student_001` to `student_060`) as referenced in Part 3
    profiles = ["improving", "plateaued", "guessing", "mastered"]
    students = []
    
    for i in range(1, 61):
        if i == 1:
            profile = "improving"
        elif i == 2:
            profile = "plateaued"
        elif i == 3:
            profile = "guessing"
        elif i == 4:
            profile = "mastered"
        else:
            profile = random.choices(profiles, weights=[0.35, 0.25, 0.20, 0.20])[0]
            
        students.append({
            "student_id": f"student_{i:03d}_{profile}",
            "profile": profile
        })
        
    base_time = datetime(2026, 7, 19, 8, 30, 0)
    rows = []
    
    for student in students:
        s_id = student["student_id"]
        profile = student["profile"]
        
        for skill in skills:
            skill_id = skill["skill_id"]
            num_attempts = random.randint(8, 15)
            current_time = base_time + timedelta(minutes=random.randint(0, 30))
            
            # Latent knowledge tracker for improving students
            latent_knowledge = 0.15 if profile != "mastered" else 0.85
            
            for attempt_idx in range(1, num_attempts + 1):
                submission_id = str(uuid.uuid4())
                
                if profile == "improving":
                    # Starts struggling, learns over time
                    if attempt_idx <= 3:
                        correct = 0 if random.random() < 0.75 else 1
                        resp_time = random.randint(12000, 25000)
                    else:
                        latent_knowledge = min(0.95, latent_knowledge + 0.22)
                        correct = 1 if random.random() < latent_knowledge else 0
                        resp_time = max(3000, int(18000 - attempt_idx * 1200))
                        
                elif profile == "plateaued":
                    # Stuck around 40-50% success rate, often takes very long durations
                    correct = 1 if random.random() < 0.45 else 0
                    resp_time = random.randint(25000, 55000) if correct == 0 else random.randint(10000, 20000)
                    
                elif profile == "guessing":
                    # Rapid guessing: very short response times, random coin flip accuracy
                    correct = 1 if random.random() < 0.35 else 0
                    resp_time = random.randint(350, 950)
                    
                elif profile == "mastered":
                    # High performer: fast, accurate
                    correct = 1 if random.random() < 0.90 else 0
                    resp_time = random.randint(2500, 6000)
                
                # Advance time for next attempt
                current_time += timedelta(seconds=int(resp_time / 1000) + random.randint(5, 30))
                timestamp_str = current_time.isoformat()
                
                row = {
                    "submission_id": submission_id,
                    "student_id": s_id,
                    "skill_id": skill_id,
                    "correct": correct,
                    "timestamp": timestamp_str,
                    "response_time_ms": resp_time,
                    "quirk_notes": "clean"
                }
                
                rows.append(row)
                
                # DELIBERATE QUIRKS INJECTION (Part 0 Requirement)
                # Quirk 1: Duplicate submissions (simulating 2G/3G network double-tap / retry loop)
                if random.random() < 0.04:
                    dup_row = row.copy()
                    dup_row["quirk_notes"] = "duplicate_submission_2G_retry"
                    # Duplicate submission occurs 2 seconds later
                    dup_time = current_time + timedelta(seconds=2)
                    dup_row["timestamp"] = dup_time.isoformat()
                    rows.append(dup_row)
                    
                # Quirk 2: Missing timestamp (simulating offline device clock loss/desync)
                if random.random() < 0.03:
                    row["timestamp"] = ""
                    row["quirk_notes"] = "missing_timestamp_device_desync"
                    
                # Quirk 3: Implausible response time anomalies
                if random.random() < 0.02:
                    if random.random() < 0.5:
                        row["response_time_ms"] = 12  # Impossible human click speed (bot/script/accidental tap)
                        row["quirk_notes"] = "implausible_rapid_click_12ms"
                    else:
                        row["response_time_ms"] = 43200000  # 12 hours (tablet left sleeping overnight before submitting)
                        row["quirk_notes"] = "implausible_session_sleep_12hrs"

    # Sort rows generally by timestamp (putting empty timestamps at the end or retaining order)
    # We sort by student_id and attempt sequence for clean readability
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "submission_id", "student_id", "skill_id", "correct", 
            "timestamp", "response_time_ms", "quirk_notes"
        ])
        writer.writeheader()
        writer.writerows(rows)
        
    print(f"Dataset generated successfully at {output_path} with {len(rows)} rows across {len(students)} students.")

if __name__ == "__main__":
    generate_classroom_dataset("data/student_responses.csv")
