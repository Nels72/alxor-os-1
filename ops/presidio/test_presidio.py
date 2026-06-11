"""
Test script for Presidio Alxor API.
Run locally to verify anonymization works correctly with French insurance data.

Usage:
    python test_presidio.py              # Test against running API
    python test_presidio.py --local      # Test engines directly (no Flask)
"""

import json
import sys

# ---------------------------------------------------------------------------
# Test data - realistic French insurance RI content
# ---------------------------------------------------------------------------

TEST_RI_TEXT = """
RELEVE D'INFORMATION AUTOMOBILE
Emetteur : MACIF - Mutuelle Assurance des Commercants et Industriels de France
Numero d'enregistrement : 781 683 417

PRENEUR D'ASSURANCE
Nom et prenom(s) : DUPONT Jean-Pierre
Date de naissance : 15/03/1985
Adresse : 12 avenue des Champs-Elysees, 75008 Paris

CONTRAT
Numero de police : AUTO-2024-78451
Date d'effet : 01/06/2022
Date de resiliation : En cours

VEHICULE
Immatriculation : FG-456-HJ
Marque : PEUGEOT
Modele : 3008 GT
Usage : Non professionnel

CONDUCTEURS
1. DUPONT Jean-Pierre - Principal - Permis 15AB78451 - Date permis : 03/2003 - Ne le 15/03/1985
2. MARTIN Sophie - Secondaire - Permis 18CD95623 - Date permis : 06/2018 - Nee le 22/07/1990

BONUS-MALUS
Coefficient : 0.50 (14 annees consecutives a 0.50)
Date d'echeance : 01/06/2026

SINISTRES (36 derniers mois)
- 12/09/2024 : Bris de glace - Non responsable
- 03/02/2023 : Accident materiel - Responsable (conducteur : DUPONT Jean-Pierre)

Coordonnees souscripteur : jean-pierre.dupont@gmail.com / 06 12 34 56 78
"""

TEST_RI_TEXT_2 = """
Compagnie : AXA France
Souscripteur : BENALI Mohamed
Ne le 28/11/1972
Adresse : 45 rue Victor Hugo, 69003 Lyon
Telephone : 07.98.76.54.32
Email : m.benali@hotmail.fr
SIRET : 572 084 026 00017

Vehicule : BMW Serie 3 - Immatriculation : EK-789-NP
Contrat : AXA-AUTO-2023-112233
Coefficient bonus-malus : 0.76
"""


def test_via_api():
    """Test against running Flask API."""
    import requests

    base_url = "http://localhost:5080"

    print("=" * 70)
    print("TESTING PRESIDIO ALXOR API")
    print("=" * 70)

    # 1. Health check
    print("\n--- 1. Health Check ---")
    try:
        r = requests.get(f"{base_url}/health", timeout=5)
        print(json.dumps(r.json(), indent=2))
    except requests.ConnectionError:
        print("ERROR: API not running. Start with: python presidio_api.py")
        sys.exit(1)

    # 2. Analyze (detect only)
    print("\n--- 2. Analyze (detect PII) ---")
    r = requests.post(f"{base_url}/analyze", json={"text": TEST_RI_TEXT, "language": "fr"})
    analysis = r.json()
    print(f"Found {analysis['count']} PII entities:")
    for f in analysis["findings"]:
        print(f"  [{f['entity_type']}] score={f['score']} -> \"{f['text']}\"")

    # 3. Anonymize
    print("\n--- 3. Anonymize ---")
    r = requests.post(f"{base_url}/anonymize", json={"text": TEST_RI_TEXT, "language": "fr"})
    anon = r.json()
    print(f"Stats: {anon['stats']}")
    print(f"Mapping ID: {anon['mapping_id']}")
    print(f"\nMapping:")
    for placeholder, original in anon["mapping"].items():
        print(f"  {placeholder} -> \"{original}\"")
    print(f"\nAnonymized text (first 500 chars):")
    print(anon["anonymized_text"][:500])

    # Verify business data is preserved
    print("\n--- Verification: Business data preserved ---")
    anon_text = anon["anonymized_text"]
    checks = {
        "Immatriculation FG-456-HJ": "FG-456-HJ" in anon_text,
        "Bonus-malus 0.50": "0.50" in anon_text,
        "PEUGEOT": "PEUGEOT" in anon_text,
        "3008 GT": "3008 GT" in anon_text,
        "Bris de glace": "Bris de glace" in anon_text,
    }
    for check, ok in checks.items():
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {check}")

    checks_anon = {
        "Nom DUPONT anonymise": "DUPONT" not in anon_text,
        "Email anonymise": "dupont@gmail.com" not in anon_text,
        "Telephone anonymise": "06 12 34 56 78" not in anon_text,
    }
    for check, ok in checks_anon.items():
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {check}")

    # 4. Deanonymize
    print("\n--- 4. Deanonymize ---")
    test_extracted = {
        "meta": {
            "souscripteur_nom_complet": list(anon["mapping"].values())[0] if anon["mapping"] else "test",
            "compagnie_precedente": "MACIF",
        },
        "vehicule": {
            "immatriculation": "FG-456-HJ",
            "marque": "PEUGEOT",
        },
    }

    # Replace actual values with placeholders to simulate Gemini output
    test_gemini_output = json.dumps(test_extracted)
    for placeholder, original in anon["mapping"].items():
        test_gemini_output = test_gemini_output.replace(original, placeholder)
    test_gemini_output = json.loads(test_gemini_output)

    r = requests.post(f"{base_url}/deanonymize", json={
        "data": test_gemini_output,
        "mapping_id": anon["mapping_id"],
    })
    deanon = r.json()
    print(f"Replacements made: {deanon['replacements_made']}")
    print(f"Restored data: {json.dumps(deanon['data'], indent=2, ensure_ascii=False)}")

    # 5. Test with second RI
    print("\n--- 5. Second RI Test ---")
    r = requests.post(f"{base_url}/anonymize_for_gemini", json={
        "text": TEST_RI_TEXT_2, "language": "fr"
    })
    anon2 = r.json()
    print(f"Entities anonymized: {anon2['stats']['entities_anonymized']}")
    print(f"Entity types: {anon2['stats']['entities_types']}")
    print(f"Anonymized text:\n{anon2['anonymized_text']}")

    # Verify BMW immatriculation kept
    assert "EK-789-NP" in anon2["anonymized_text"], "FAIL: Immatriculation should be kept!"
    print("\n[PASS] Immatriculation EK-789-NP preserved in anonymized text")

    print("\n" + "=" * 70)
    print("ALL TESTS COMPLETED")
    print("=" * 70)


def test_local():
    """Test engines directly without Flask."""
    print("Loading Presidio engines locally...")

    from presidio_api import analyzer, anonymizer, ALL_ENTITIES, ENTITIES_TO_ANONYMIZE, SCORE_THRESHOLD

    print("Analyzing test text...")
    results = analyzer.analyze(
        text=TEST_RI_TEXT,
        language="fr",
        entities=ALL_ENTITIES,
        score_threshold=SCORE_THRESHOLD,
    )

    print(f"\nFound {len(results)} entities:")
    for r in results:
        text_fragment = TEST_RI_TEXT[r.start:r.end]
        anonymize_flag = "ANON" if r.entity_type in ENTITIES_TO_ANONYMIZE else "KEEP"
        print(f"  [{r.entity_type}] [{anonymize_flag}] score={r.score:.2f} -> \"{text_fragment}\"")


if __name__ == "__main__":
    if "--local" in sys.argv:
        test_local()
    else:
        test_via_api()
