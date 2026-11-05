"""Approved SEO phrase library and matching rules."""

from typing import List

SEO_PHRASES = {
    "brand": "Goa Courier Services",
    "general": "courier service in Goa",
    "international": "international courier service from Goa",
    "domestic": "domestic courier service in Goa",
    "worldwide": "worldwide shipping from Goa",
    "packing": "professional packing services",
    "secure_delivery": "secure parcel delivery",
    "branches": {
        "Margao": "courier service in Margao",
        "Agassaim": "courier service in Agassaim",
        "Porvorim": "courier service in Porvorim",
        "Canacona": "courier service in Canacona",
    }
}

def select_seo_phrases(rating: int, comment: str, location_name: str) -> List[str]:
    """
    Select 1 (maximum 2) relevant SEO phrases based on review text and branch context.
    """
    comment_lower = comment.lower() if comment else ""
    selected = []
    
    # Check for branch match
    for branch, phrase in SEO_PHRASES["branches"].items():
        if branch.lower() in location_name.lower():
            selected.append(phrase)
            break
            
    # Check context keywords
    if any(k in comment_lower for k in ["international", "abroad", "foreign", "uk", "usa", "dubai", "gulf", "overseas"]):
        selected.append(SEO_PHRASES["international"])
    elif any(k in comment_lower for k in ["pack", "box", "bubble", "wrap"]):
        selected.append(SEO_PHRASES["packing"])
    elif any(k in comment_lower for k in ["safe", "secure", "care"]):
        selected.append(SEO_PHRASES["secure_delivery"])
    elif any(k in comment_lower for k in ["domestic", "india", "mumbai", "delhi", "bangalore", "kerala"]):
        selected.append(SEO_PHRASES["domestic"])
        
    # Fallback to general or brand
    if not selected:
        selected.append(SEO_PHRASES["general"])
        
    # Strict rule: maximum 2 phrases
    return selected[:2]
