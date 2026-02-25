from app.schemas.profile import ProfileSubmissionRequest, MatrixBreakdown, MatrixCategoryBreakdown

class MatrixScorer:
    """Calculates deterministic points out of 100 based on the RBU CDPC placement metric schema."""
    
    @staticmethod
    def calculate_score(data: ProfileSubmissionRequest) -> tuple[float, MatrixBreakdown]:
        # 1. Academics (Max 20 points)
        # Assuming CGPA is normalized to 10 scale
        cgpa_normalized = data.academic.cgpa * (10 / data.academic.cgpaScale)
        
        academics_pts = 0.0
        if cgpa_normalized >= 9.0:
            academics_pts = 20.0
        elif cgpa_normalized >= 8.5:
            academics_pts = 17.0
        elif cgpa_normalized >= 8.0:
            academics_pts = 14.0
        elif cgpa_normalized >= 7.5:
            academics_pts = 11.0
        elif cgpa_normalized >= 7.0:
            academics_pts = 8.0
        
        # Deduct 5 points per active backlog
        academics_pts = max(0.0, academics_pts - (data.academic.backlogs * 5))

        # 2. Internships (Max 20 points)
        internship_pts = 0.0
        if data.experience.internshipCount > 0:
            if data.experience.internshipType == 'international':
                internship_pts = 20.0
            elif data.experience.internshipType == 'it_company':
                internship_pts = 15.0 if data.experience.internshipStipendAbove10k else 10.0
            elif data.experience.internshipType == 'eduskills':
                internship_pts = 5.0
        
        # 3. Projects (Max 15 points)
        projects_pts = min(15.0, (data.experience.projectsIndustry * 10) + (data.experience.projectsDomain * 5))

        # 4. Coding Profile (Max 15 points)
        coding_pts = 0.0
        # HackerRank evaluation
        hr_pts = min(10.0, (data.coding.hrBadges * 2) + (data.coding.hrMedHardSolved * 1))
        # GitHub evaluation
        github_pts = min(5.0, (data.coding.githubContributions // 50) + (data.coding.githubCollaborations * 2))
        if data.coding.githubMonthlyActive:
            github_pts += 2
            
        coding_pts = min(15.0, hr_pts + github_pts + (data.coding.lcSubmissions / 100))

        # 5. Hackathons (Max 15 points)
        hackathon_pts = min(15.0, 
            (data.experience.hackathonFirst * 10) + 
            (data.experience.hackathonSecond * 8) + 
            (data.experience.hackathonThird * 5) + 
            (data.experience.hackathonParticipation * 2)
        )

        # 6. Certifications (Max 15 points)
        cert_pts = min(15.0,
            (data.experience.certsGlobal * 10) +
            (min(2, data.experience.certsNptel) * 5) +
            (min(2, data.experience.certsRbu) * 2)
        )

        # Total Matrix Score
        total_score = sum([academics_pts, internship_pts, projects_pts, coding_pts, hackathon_pts, cert_pts])

        breakdown = MatrixBreakdown(
            academics=MatrixCategoryBreakdown(score=academics_pts, maxScore=20.0),
            internship=MatrixCategoryBreakdown(score=internship_pts, maxScore=20.0),
            projects=MatrixCategoryBreakdown(score=projects_pts, maxScore=15.0),
            coding=MatrixCategoryBreakdown(score=coding_pts, maxScore=15.0),
            hackathons=MatrixCategoryBreakdown(score=hackathon_pts, maxScore=15.0),
            certifications=MatrixCategoryBreakdown(score=cert_pts, maxScore=15.0)
        )

        return (total_score, breakdown)
