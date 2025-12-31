#!/usr/bin/env python3
"""
Script to create dummy PDF documents for restaurant onboarding
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from datetime import datetime, timedelta
import os

# Restaurant details
RESTAURANT_NAME = "Il Sole Cucina"
RESTAURANT_ADDRESS = "31441 Santa Margarita Pkwy Suite M"
RESTAURANT_CITY = "Rancho Santa Margarita"
RESTAURANT_STATE = "CA"
RESTAURANT_ZIP = "92688"
CONTACT_NAME = "Marco Rossi"
CONTACT_PHONE = "(949) 264-6161"
CONTACT_EMAIL = "info@ilsolecucina.com"

# Create output directory
OUTPUT_DIR = "/Users/jeet/doordash-p2p/backend/documents"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def create_w9_form():
    """Create a dummy W-9 Tax Form PDF"""
    filename = os.path.join(OUTPUT_DIR, "w9_form_il_sole_cucina.pdf")
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter

    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Form W-9")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 70, "Request for Taxpayer Identification Number and Certification")
    c.drawString(50, height - 85, "Department of the Treasury - Internal Revenue Service")

    # Box around form
    c.rect(40, 100, width - 80, height - 150)

    # Form fields
    y = height - 120
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "1. Name (as shown on your income tax return):")
    c.setFont("Helvetica", 10)
    c.drawString(300, y, f"{RESTAURANT_NAME} LLC")

    y -= 30
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "2. Business name/disregarded entity name:")
    c.setFont("Helvetica", 10)
    c.drawString(300, y, RESTAURANT_NAME)

    y -= 30
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "3. Federal tax classification:")
    c.setFont("Helvetica", 10)
    c.drawString(300, y, "Limited Liability Company (LLC)")

    y -= 30
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "4. Exemptions:")
    c.setFont("Helvetica", 10)
    c.drawString(300, y, "N/A")

    y -= 30
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "5. Address:")
    c.setFont("Helvetica", 10)
    c.drawString(300, y, RESTAURANT_ADDRESS)

    y -= 20
    c.drawString(300, y, f"{RESTAURANT_CITY}, {RESTAURANT_STATE} {RESTAURANT_ZIP}")

    y -= 30
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "6. Requester's name and address (optional):")
    c.setFont("Helvetica", 10)
    c.drawString(300, y, "Dollor.ai Platform")

    y -= 50
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Part I - Taxpayer Identification Number (TIN)")

    y -= 25
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Employer Identification Number (EIN):")
    c.setFont("Helvetica", 10)
    c.drawString(300, y, "84-3215678")

    y -= 50
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Part II - Certification")

    y -= 25
    c.setFont("Helvetica", 9)
    c.drawString(50, y, "Under penalties of perjury, I certify that:")
    y -= 15
    c.drawString(50, y, "1. The number shown on this form is my correct taxpayer identification number")
    y -= 15
    c.drawString(50, y, "2. I am not subject to backup withholding")
    y -= 15
    c.drawString(50, y, "3. I am a U.S. citizen or other U.S. person")
    y -= 15
    c.drawString(50, y, "4. The FATCA code(s) entered on this form is correct")

    y -= 40
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Signature:")
    c.setFont("Helvetica-Oblique", 12)
    c.drawString(150, y, "Marco Rossi")

    y -= 25
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Date:")
    c.setFont("Helvetica", 10)
    c.drawString(150, y, datetime.now().strftime("%m/%d/%Y"))

    # Footer
    c.setFont("Helvetica", 8)
    c.drawString(50, 50, "Form W-9 (Rev. 10-2018)")
    c.drawString(400, 50, "SAMPLE DOCUMENT FOR DEMONSTRATION")

    c.save()
    print(f"Created: {filename}")
    return filename


def create_business_license():
    """Create a dummy Business License PDF"""
    filename = os.path.join(OUTPUT_DIR, "business_license_il_sole_cucina.pdf")
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter

    # Decorative border
    c.setStrokeColor(colors.darkblue)
    c.setLineWidth(3)
    c.rect(30, 30, width - 60, height - 60)
    c.setLineWidth(1)
    c.rect(35, 35, width - 70, height - 70)

    # Header
    c.setFont("Helvetica-Bold", 20)
    c.setFillColor(colors.darkblue)
    c.drawCentredString(width/2, height - 80, "STATE OF CALIFORNIA")
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width/2, height - 105, "COUNTY OF ORANGE")

    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width/2, height - 150, "BUSINESS LICENSE")

    # License number
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(width/2, height - 180, "License No: BL-2024-RSM-04521")

    # Body
    y = height - 230
    c.setFont("Helvetica", 12)
    c.drawCentredString(width/2, y, "This is to certify that")

    y -= 30
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width/2, y, RESTAURANT_NAME)

    y -= 30
    c.setFont("Helvetica", 12)
    c.drawCentredString(width/2, y, "is hereby licensed to conduct business at")

    y -= 30
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(width/2, y, RESTAURANT_ADDRESS)
    c.drawCentredString(width/2, y - 18, f"{RESTAURANT_CITY}, {RESTAURANT_STATE} {RESTAURANT_ZIP}")

    y -= 60
    c.setFont("Helvetica", 12)
    c.drawCentredString(width/2, y, "Business Type: Restaurant / Food Service")

    y -= 25
    c.drawCentredString(width/2, y, "NAICS Code: 722511 - Full-Service Restaurants")

    y -= 40
    c.setFont("Helvetica-Bold", 12)
    c.drawString(80, y, "Issue Date:")
    c.setFont("Helvetica", 12)
    c.drawString(200, y, "January 15, 2024")

    c.setFont("Helvetica-Bold", 12)
    c.drawString(350, y, "Expiration Date:")
    c.setFont("Helvetica", 12)
    c.drawString(470, y, "January 14, 2026")

    # Signatures
    y -= 80
    c.line(80, y, 250, y)
    c.line(350, y, 520, y)

    y -= 15
    c.setFont("Helvetica", 10)
    c.drawString(100, y, "City Clerk Signature")
    c.drawString(380, y, "Business License Official")

    # Seal placeholder
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.darkblue)
    c.circle(width/2, 150, 50, stroke=1, fill=0)
    c.drawCentredString(width/2, 155, "CITY OF")
    c.drawCentredString(width/2, 140, "RANCHO SANTA")
    c.drawCentredString(width/2, 125, "MARGARITA")
    c.setFont("Helvetica", 8)
    c.drawCentredString(width/2, 110, "OFFICIAL SEAL")

    c.setFillColor(colors.gray)
    c.setFont("Helvetica", 8)
    c.drawCentredString(width/2, 50, "SAMPLE DOCUMENT FOR DEMONSTRATION PURPOSES")

    c.save()
    print(f"Created: {filename}")
    return filename


def create_food_handler_certificate():
    """Create a dummy Food Handler Certificate PDF"""
    filename = os.path.join(OUTPUT_DIR, "food_handler_cert_il_sole_cucina.pdf")
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter

    # Background color header
    c.setFillColor(colors.Color(0.1, 0.4, 0.1))  # Dark green
    c.rect(0, height - 120, width, 120, fill=1)

    # Header text
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width/2, height - 50, "FOOD HANDLER CERTIFICATE")
    c.setFont("Helvetica", 14)
    c.drawCentredString(width/2, height - 80, "California Food Handler Card Program")
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, height - 100, "Approved by Orange County Health Care Agency")

    # Body
    c.setFillColor(colors.black)
    y = height - 160
    c.setFont("Helvetica", 12)
    c.drawCentredString(width/2, y, "This certifies that")

    y -= 30
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width/2, y, CONTACT_NAME)

    y -= 25
    c.setFont("Helvetica", 12)
    c.drawCentredString(width/2, y, f"representing {RESTAURANT_NAME}")

    y -= 35
    c.drawCentredString(width/2, y, "has successfully completed the California Food Handler Training Program")
    y -= 18
    c.drawCentredString(width/2, y, "and has demonstrated knowledge of food safety principles including:")

    # Topics covered
    y -= 40
    topics = [
        "• Personal Hygiene and Handwashing",
        "• Time and Temperature Control",
        "• Cross-Contamination Prevention",
        "• Cleaning and Sanitizing",
        "• Allergen Awareness",
        "• Safe Food Storage Practices"
    ]
    c.setFont("Helvetica", 11)
    for topic in topics:
        c.drawCentredString(width/2, y, topic)
        y -= 18

    # Certificate details
    y -= 30
    c.setFont("Helvetica-Bold", 11)
    c.drawString(100, y, "Certificate Number:")
    c.setFont("Helvetica", 11)
    c.drawString(230, y, "CA-FH-2024-784521")

    y -= 25
    c.setFont("Helvetica-Bold", 11)
    c.drawString(100, y, "Issue Date:")
    c.setFont("Helvetica", 11)
    c.drawString(230, y, "March 1, 2024")

    c.setFont("Helvetica-Bold", 11)
    c.drawString(350, y, "Expiration Date:")
    c.setFont("Helvetica", 11)
    expiry = (datetime.now() + timedelta(days=365*2)).strftime("%B %d, %Y")
    c.drawString(470, y, expiry)

    y -= 25
    c.setFont("Helvetica-Bold", 11)
    c.drawString(100, y, "Location:")
    c.setFont("Helvetica", 11)
    c.drawString(230, y, f"{RESTAURANT_ADDRESS}, {RESTAURANT_CITY}, {RESTAURANT_STATE}")

    # Signature
    y -= 60
    c.line(150, y, 350, y)
    y -= 15
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, y, "Program Administrator")

    # Footer
    c.setFillColor(colors.Color(0.1, 0.4, 0.1))
    c.rect(0, 0, width, 60, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 9)
    c.drawCentredString(width/2, 40, "This certificate is valid for 3 years from the issue date")
    c.drawCentredString(width/2, 25, "SAMPLE DOCUMENT FOR DEMONSTRATION PURPOSES")

    c.save()
    print(f"Created: {filename}")
    return filename


def create_health_permit():
    """Create a dummy Health Permit PDF"""
    filename = os.path.join(OUTPUT_DIR, "health_permit_il_sole_cucina.pdf")
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter

    # Border
    c.setStrokeColor(colors.darkred)
    c.setLineWidth(4)
    c.rect(25, 25, width - 50, height - 50)

    # Header
    c.setFillColor(colors.darkred)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width/2, height - 60, "ORANGE COUNTY HEALTH CARE AGENCY")
    c.setFont("Helvetica", 11)
    c.drawCentredString(width/2, height - 78, "Environmental Health Division")

    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width/2, height - 120, "HEALTH PERMIT")

    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width/2, height - 150, "Food Facility Operation")

    # Permit details
    c.setFillColor(colors.black)
    y = height - 200

    c.setFont("Helvetica-Bold", 12)
    c.drawString(80, y, "Permit Number:")
    c.setFont("Helvetica", 12)
    c.drawString(200, y, "HP-OC-2024-45892")

    y -= 30
    c.setFont("Helvetica-Bold", 12)
    c.drawString(80, y, "Facility Name:")
    c.setFont("Helvetica", 12)
    c.drawString(200, y, RESTAURANT_NAME)

    y -= 25
    c.setFont("Helvetica-Bold", 12)
    c.drawString(80, y, "Address:")
    c.setFont("Helvetica", 12)
    c.drawString(200, y, RESTAURANT_ADDRESS)
    c.drawString(200, y - 15, f"{RESTAURANT_CITY}, {RESTAURANT_STATE} {RESTAURANT_ZIP}")

    y -= 50
    c.setFont("Helvetica-Bold", 12)
    c.drawString(80, y, "Facility Type:")
    c.setFont("Helvetica", 12)
    c.drawString(200, y, "Restaurant - Full Service")

    y -= 25
    c.setFont("Helvetica-Bold", 12)
    c.drawString(80, y, "Risk Category:")
    c.setFont("Helvetica", 12)
    c.drawString(200, y, "Category 2 - Moderate Risk")

    y -= 25
    c.setFont("Helvetica-Bold", 12)
    c.drawString(80, y, "Seating Capacity:")
    c.setFont("Helvetica", 12)
    c.drawString(200, y, "65")

    y -= 40
    c.setFont("Helvetica-Bold", 12)
    c.drawString(80, y, "Issue Date:")
    c.setFont("Helvetica", 12)
    c.drawString(200, y, "February 1, 2024")

    c.setFont("Helvetica-Bold", 12)
    c.drawString(350, y, "Expiration:")
    c.setFont("Helvetica", 12)
    expiry = (datetime.now() + timedelta(days=365)).strftime("%B %d, %Y")
    c.drawString(450, y, expiry)

    # Inspection score
    y -= 50
    c.setFillColor(colors.Color(0, 0.5, 0))  # Green
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width/2, y, "LATEST INSPECTION SCORE: 96 / 100 - GRADE A")

    # Conditions
    c.setFillColor(colors.black)
    y -= 40
    c.setFont("Helvetica-Bold", 11)
    c.drawString(80, y, "This permit is issued subject to compliance with:")
    y -= 20
    c.setFont("Helvetica", 10)
    c.drawString(100, y, "• California Health and Safety Code")
    y -= 15
    c.drawString(100, y, "• California Retail Food Code")
    y -= 15
    c.drawString(100, y, "• Orange County Code of Ordinances")

    # Signatures
    y -= 50
    c.line(80, y, 250, y)
    c.line(350, y, 520, y)
    y -= 15
    c.setFont("Helvetica", 9)
    c.drawString(100, y, "Environmental Health Director")
    c.drawString(380, y, "Date of Issue")

    # Seal
    c.setStrokeColor(colors.darkred)
    c.setLineWidth(2)
    c.circle(width/2, 120, 45, stroke=1, fill=0)
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.darkred)
    c.drawCentredString(width/2, 130, "ORANGE COUNTY")
    c.drawCentredString(width/2, 118, "HEALTH CARE")
    c.drawCentredString(width/2, 106, "AGENCY")

    c.setFillColor(colors.gray)
    c.setFont("Helvetica", 8)
    c.drawCentredString(width/2, 45, "SAMPLE DOCUMENT FOR DEMONSTRATION PURPOSES")

    c.save()
    print(f"Created: {filename}")
    return filename


def create_liability_insurance():
    """Create a dummy Liability Insurance Certificate PDF"""
    filename = os.path.join(OUTPUT_DIR, "liability_insurance_il_sole_cucina.pdf")
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter

    # Header
    c.setFillColor(colors.navy)
    c.rect(0, height - 100, width, 100, fill=1)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width/2, height - 45, "CERTIFICATE OF INSURANCE")
    c.setFont("Helvetica", 12)
    c.drawCentredString(width/2, height - 70, "General Liability Coverage")
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, height - 88, "Pacific Coast Insurance Company")

    # Certificate number
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(400, height - 120, "Certificate No: GL-2024-892145")

    # Policyholder info
    y = height - 155
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "INSURED:")
    y -= 20
    c.setFont("Helvetica", 11)
    c.drawString(50, y, f"{RESTAURANT_NAME} LLC")
    y -= 15
    c.drawString(50, y, RESTAURANT_ADDRESS)
    y -= 15
    c.drawString(50, y, f"{RESTAURANT_CITY}, {RESTAURANT_STATE} {RESTAURANT_ZIP}")

    # Coverage details table
    y -= 40
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "COVERAGE DETAILS:")

    y -= 25
    data = [
        ["Coverage Type", "Limit", "Deductible"],
        ["General Liability", "$1,000,000 per occurrence", "$2,500"],
        ["General Aggregate", "$2,000,000", "-"],
        ["Products/Completed Operations", "$1,000,000", "$2,500"],
        ["Personal & Advertising Injury", "$1,000,000", "$1,000"],
        ["Damage to Rented Premises", "$100,000", "$1,000"],
        ["Medical Expense (any one person)", "$5,000", "$0"],
        ["Liquor Liability", "$1,000,000", "$5,000"],
        ["Food Contamination", "$500,000", "$2,500"],
    ]

    table = Table(data, colWidths=[220, 170, 100])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.navy),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))

    table.wrapOn(c, width, height)
    table.drawOn(c, 50, y - 200)

    # Policy period
    y -= 230
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Policy Number:")
    c.setFont("Helvetica", 11)
    c.drawString(170, y, "PCG-GL-2024-478521")

    y -= 20
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Policy Period:")
    c.setFont("Helvetica", 11)
    policy_start = datetime.now().strftime("%B %d, %Y")
    policy_end = (datetime.now() + timedelta(days=365)).strftime("%B %d, %Y")
    c.drawString(170, y, f"{policy_start} to {policy_end}")

    # Certificate holder
    y -= 35
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "CERTIFICATE HOLDER:")
    y -= 18
    c.setFont("Helvetica", 10)
    c.drawString(50, y, "Dollor.ai Platform")
    y -= 12
    c.drawString(50, y, "For verification purposes only")

    # Authorized signature
    y -= 40
    c.line(350, y, 550, y)
    y -= 15
    c.setFont("Helvetica", 9)
    c.drawString(380, y, "Authorized Representative")

    c.setFont("Helvetica-Oblique", 11)
    c.drawString(380, y + 20, "Jennifer Martinez, Agent")

    # Footer
    c.setFillColor(colors.gray)
    c.setFont("Helvetica", 8)
    c.drawCentredString(width/2, 50, "This certificate is issued as a matter of information only and confers no rights upon the certificate holder.")
    c.drawCentredString(width/2, 38, "SAMPLE DOCUMENT FOR DEMONSTRATION PURPOSES")

    c.save()
    print(f"Created: {filename}")
    return filename


if __name__ == "__main__":
    print("Creating documents for Il Sole Cucina...")
    print("=" * 50)

    w9 = create_w9_form()
    bl = create_business_license()
    fh = create_food_handler_certificate()
    hp = create_health_permit()
    li = create_liability_insurance()

    print("=" * 50)
    print("All documents created successfully!")
    print(f"\nDocuments saved to: {OUTPUT_DIR}")
    print("\nFiles created:")
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith('.pdf'):
            filepath = os.path.join(OUTPUT_DIR, f)
            size = os.path.getsize(filepath)
            print(f"  - {f} ({size:,} bytes)")
