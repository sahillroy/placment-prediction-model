import io
import re
from typing import Tuple, List

from pypdf2 import PdfReader

# Simple domain keyword sets for ATS matching
DOMAIN_KEYWORDS = {
    "software_engineering": [
        "python", "java", "c++", "javascript", "react", "node", "sql", "aws", 
        "docker", "kubernetes", "agile", "git", "ci/cd", "machine learning",
        "api", "linux", "cloud", "algorithms", "data structures"
    ]
}

class ResumeParser:
    """Extracts raw text from PDF bytes and identifies ATS keyword gaps."""
    
    @staticmethod
    def extract_text(pdf_bytes: bytes) -> str:
        """Reads a byte-stream PDF and returns normalized text."""
        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))
            text = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
            
            # Normalize whitespace/newlines
            full_text = " ".join(text)
            full_text = re.sub(r'\s+', ' ', full_text).lower()
            return full_text
        except Exception as e:
            # Fallback securely so the main API doesn't 500
            print(f"Error parsing PDF: {e}")
            return ""

    @staticmethod
    def calculate_ats_score(text: str, domain: str = "software_engineering", expected_match_count: int = 10) -> Tuple[float, List[str]]:
        """
        Calculates an ATS Score out of 100 based on keyword density.
        Returns the score and a list of missing critical keywords.
        """
        if not text:
            return (0.0, ["Resume parsing failed - please upload standard text PDF."])
            
        keywords = DOMAIN_KEYWORDS.get(domain, [])
        found_keywords = set()
        missing_keywords = []
        
        # Simple exact substring match
        for kw in keywords:
            if kw in text:
                found_keywords.add(kw)
            else:
                missing_keywords.append(kw)
                
        # Score calculation: Cap at 100% based on matching expected count
        match_count = len(found_keywords)
        raw_score = (match_count / expected_match_count) * 100.0
        ats_score = min(100.0, raw_score)
        
        # Determine the top 3 high-priority gaps
        top_gaps = missing_keywords[:3]
        
        return (round(ats_score, 1), top_gaps)
