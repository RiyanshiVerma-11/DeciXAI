import sys
import os
from pathlib import Path

# Configure utf-8 stdout on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from services.resume_parser_service import parse_and_analyze_resume

TEST_RESUME_FILES = [
    r"D:\Riyanshi\06_registration things of riya\03_resumes\Riyanshi Verma Resume.pdf",
    r"D:\Riyanshi\06_registration things of riya\03_resumes\Riyanshi Resume.docx",
    r"D:\Riyanshi\06_registration things of riya\03_resumes\friends resume\Riya_Singhal_Resume.pdf",
    r"D:\Riyanshi\06_registration things of riya\03_resumes\friends resume\GEETANSHI resume.docx",
    r"D:\Riyanshi\06_registration things of riya\03_resumes\old resume my personal\Riyanshi_Verma_Resume_VoteWise_Updated.pdf",
]

def run_tests():
    print("=" * 80)
    print("BATCH RESUME PARSING & DECISION XAI AUDIT ACROSS 03_RESUMES")
    print("=" * 80)

    results_summary = []

    for file_path in TEST_RESUME_FILES:
        path = Path(file_path)
        if not path.exists():
            print(f"[SKIP] File not found: {file_path}")
            continue

        print(f"\n[TESTING] Processing: {path.name}")
        print(f"Path: {file_path}")
        print("-" * 60)

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        try:
            res = parse_and_analyze_resume(file_bytes, path.name)
            profile = res.get("parsed_profile") or {}
            decision = res.get("decision") or {}
            details = decision.get("details") or {}
            intelligence = details.get("career_intelligence") or {}
            best_track = intelligence.get("best_fit") or intelligence.get("interest") or {}
            alignment = best_track.get("alignment") or {}

            skills = profile.get("skills") or []
            projects = profile.get("projects") or []
            project_descriptions = profile.get("project_descriptions") or []
            achievements = profile.get("achievements") or []
            certifications = profile.get("certifications") or []

            print(f"  * Status: SUCCESS")
            print(f"  * Degree / Major: {profile.get('degree')} in {profile.get('specialization')}")
            print(f"  * CGPA / Score: {profile.get('cgpa')} ({profile.get('score_type')})")
            print(f"  * Skills Extracted ({len(skills)}): {', '.join(skills[:8])}{'...' if len(skills) > 8 else ''}")
            print(f"  * Projects Extracted ({len(projects)}): {', '.join(projects[:4])}")
            if project_descriptions:
                print(f"  * Project Descriptions Preview:")
                for idx, desc in enumerate(project_descriptions[:2]):
                    safe_desc = desc.encode("ascii", "replace").decode("ascii")
                    print(f"      [{idx+1}] {safe_desc[:100]}...")
            print(f"  * Achievements Extracted ({len(achievements)}):")
            for ach in achievements[:3]:
                safe_ach = ach.encode("ascii", "replace").decode("ascii")
                print(f"      - {safe_ach[:90]}")
            print(f"  * Certifications ({len(certifications)}): {', '.join(certifications[:3]) if certifications else 'None (Project proof evaluated)'}")

            print(f"\n  [DECISION XAI ENGINE RESULTS]")
            print(f"  * Top Recommendation: {decision.get('prediction')}")
            print(f"  * Profile Fit Score: {decision.get('score')} / 100 (Confidence: {decision.get('confidence')}%)")
            print(f"  * Alignment Badges: Skills: {alignment.get('skills')}, Projects: {alignment.get('projects')}, Certs: {alignment.get('certifications')}, Interest: {alignment.get('interest')}")

            # Check certification fairness
            has_strong_proof = len(projects) >= 2 or len(achievements) > 0
            certs_badge = alignment.get('certifications')
            if has_strong_proof and certs_badge is not None:
                assert certs_badge in ["match", "project_verified", "partial"], f"Certs should not be missing with strong proof, got: {certs_badge}"
                print(f"  * [PASS] Certifications fairly handled (Status: {certs_badge}) - no unfair penalty for zero certificates!")

            results_summary.append({
                "file": path.name,
                "status": "PASS",
                "prediction": decision.get("prediction"),
                "score": decision.get("score"),
                "skills_count": len(skills),
                "projects_count": len(projects),
                "achievements_count": len(achievements),
                "certs_badge": certs_badge,
            })

        except Exception as e:
            print(f"  * [FAIL] Error processing {path.name}: {str(e)}")
            import traceback
            traceback.print_exc()
            results_summary.append({
                "file": path.name,
                "status": "FAIL",
                "error": str(e),
            })

    print("\n" + "=" * 80)
    print("FINAL BATCH SUMMARY")
    print("=" * 80)
    for r in results_summary:
        if r["status"] == "PASS":
            print(f"[PASS] {r['file']}: Recommended -> {r['prediction']} | Score: {r['score']} | Skills: {r['skills_count']} | Projects: {r['projects_count']} | Achievements: {r['achievements_count']} | Certs: {r['certs_badge']}")
        else:
            print(f"[FAIL] {r['file']}: FAILED -> {r.get('error')}")

if __name__ == "__main__":
    run_tests()
