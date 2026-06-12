"""
Presidio Anonymization API for Alxor Insurance Platform
========================================================
Flask API that anonymizes PII before sending documents to Gemini AI,
then deanonymizes the extracted data for storage in Airtable.

Designed for French insurance documents (Releves d'Information).

Endpoints:
  POST /anonymize      - Anonymize text (replace PII with placeholders)
  POST /deanonymize    - Restore original values from placeholders in JSON
  POST /analyze        - Detect PII without anonymizing (debug/audit)
  GET  /health         - Health check
  GET  /entities       - List supported entity types

Usage from n8n:
  1. Before Gemini call: POST /anonymize with the system prompt + user text
  2. After Gemini response: POST /deanonymize with extracted JSON + mapping

Author: Alxor Security Team
Date: 2026-06-10
"""

import json
import logging
import os
import re
import uuid
from typing import Any

from flask import Flask, jsonify, request

from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern, RecognizerRegistry
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PORT = int(os.getenv("PRESIDIO_PORT", "5080"))
HOST = os.getenv("PRESIDIO_HOST", "0.0.0.0")
LOG_LEVEL = os.getenv("PRESIDIO_LOG_LEVEL", "INFO")
SCORE_THRESHOLD = float(os.getenv("PRESIDIO_SCORE_THRESHOLD", "0.4"))

# Entities to ANONYMIZE before sending to Gemini
ENTITIES_TO_ANONYMIZE = [
    "PERSON",
    "LOCATION",
    "PHONE_NUMBER",
    "EMAIL_ADDRESS",
    "DATE_OF_BIRTH",
    "FR_DRIVER_LICENSE",
    "FR_NATIONAL_ID",
    "FR_SIRET",
    "IBAN_CODE",
    "CREDIT_CARD",
    "NRP",
]

# Entities to KEEP INTACT (detected but not anonymized) - insurance business data
ENTITIES_TO_KEEP = [
    "FR_LICENSE_PLATE",  # Immatriculation - needed for tarification
]

# All entities we want to detect
ALL_ENTITIES = ENTITIES_TO_ANONYMIZE + ENTITIES_TO_KEEP

# ---------------------------------------------------------------------------
# False-positive filters for JSON/insurance context
# ---------------------------------------------------------------------------

# Generic French words spaCy incorrectly tags as LOCATION/PERSON
FALSE_POSITIVE_ALLOWLIST = {
    # Insurance domain terms
    "indetermine", "inconnue", "inconnu", "principale", "secondaire",
    "non professionnel", "professionnel", "non_responsable", "responsable",
    "bris_de_glace", "accident", "vol", "incendie", "catastrophe",
    # Country/category codes used in insurance JSON
    "fr", "eu", "a-f", "a", "b", "c", "d", "e", "f",
    # Status words
    "en cours", "resilie", "actif", "inactif", "null",
    # Misc short codes
    "true", "false",
    # RI form labels tagged as PERSON by spaCy
    "adresse", "nom", "prenom", "souscripteur", "assure",
    "conducteur", "principal", "secondaire", "emetteur",
    # Misc false positives observed on real RI data
    "nee", "nee le", "ne le",
}

# Minimum length for LOCATION entities to avoid matching short codes
LOCATION_MIN_LENGTH = 4
# Maximum length for a single LOCATION entity (real addresses rarely > 80 chars)
LOCATION_MAX_LENGTH = 80

# Minimum length for PERSON entities
PERSON_MIN_LENGTH = 3

# Regex patterns that indicate a LOCATION is actually a contract/code (not an address)
_CONTRACT_NUMBER_RE = re.compile(r'^[A-Z]+-\d{4}', re.IGNORECASE)
_DATE_LABEL_RE = re.compile(r"^date\s+d['’]", re.IGNORECASE)

# Insurance company names that contain location words but should NOT be anonymized
COMPANY_NAMES = {
    "axa france", "axa france iard", "macif", "maif", "maaf", "matmut",
    "groupama", "allianz france", "generali france", "swiss life france",
    "aviva france", "covea", "mma", "gmf", "pacifica", "gan assurances",
    "axa", "allianz", "generali", "zurich", "direct assurance",
    "easy courtage", "easy courtage assurance", "alxor",
}


def post_filter_results(results, text):
    """Remove false-positive detections common in JSON insurance data."""
    filtered = []
    for r in results:
        original = text[r.start:r.end].strip()
        original_lower = original.lower().strip('"').strip()

        # Rule 1: Skip if the detected text is in the allowlist
        if original_lower in FALSE_POSITIVE_ALLOWLIST:
            continue

        # Rule 2: Skip very short LOCATION detections (codes like "FR", "A-F")
        if r.entity_type == "LOCATION" and len(original) < LOCATION_MIN_LENGTH:
            continue

        # Rule 3: Skip LOCATION if the text looks like a code (alphanumeric, < 6 chars, no spaces)
        if (r.entity_type == "LOCATION"
                and len(original) < 6
                and " " not in original
                and re.match(r'^[A-Z0-9-]+$', original)):
            continue

        # Rule 4: Skip absurdly long LOCATION spans (spaCy NER error on dense JSON)
        if r.entity_type == "LOCATION" and len(original) > LOCATION_MAX_LENGTH:
            continue

        # Rule 5: Skip if the detected text is an insurance company name
        if original_lower in COMPANY_NAMES:
            continue

        # Rule 6: Skip if the detected text is literally part of a known company name
        if r.entity_type in ("LOCATION", "PERSON"):
            is_inside_company = False
            text_lower = text.lower()
            for company in COMPANY_NAMES:
                if len(company) <= len(original_lower):
                    continue
                idx = 0
                while True:
                    pos = text_lower.find(company, idx)
                    if pos == -1:
                        break
                    if pos <= r.start and r.end <= pos + len(company):
                        is_inside_company = True
                        break
                    idx = pos + 1
                if is_inside_company:
                    break
            if is_inside_company:
                continue

        # Rule 7: Skip PERSON entities containing a newline (spaCy NER multiline error)
        if r.entity_type == "PERSON" and "\n" in original:
            continue

        # Rule 8: Skip PERSON entities starting with punctuation/dash (NER boundary error)
        if r.entity_type == "PERSON" and original.lstrip().startswith(("-", ".", ":")):
            continue

        # Rule 9: Skip very short PERSON entities
        if r.entity_type == "PERSON" and len(original.strip()) < PERSON_MIN_LENGTH:
            continue

        # Rule 10: Skip LOCATION that looks like a contract/reference number (e.g. AUTO-2024)
        if r.entity_type == "LOCATION" and _CONTRACT_NUMBER_RE.match(original.strip()):
            continue

        # Rule 11: Skip LOCATION that starts with "Date d'" (form label, not a place)
        if r.entity_type == "LOCATION" and _DATE_LABEL_RE.match(original.strip()):
            continue

        filtered.append(r)
    return filtered

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("presidio-alxor")

# ---------------------------------------------------------------------------
# NLP Engine Setup (French)
# ---------------------------------------------------------------------------


def _detect_spacy_model() -> str:
    """Return the best available French spaCy model without triggering auto-download."""
    override = os.getenv("PRESIDIO_SPACY_MODEL", "")
    if override:
        return override
    import spacy.util
    for model in ("fr_core_news_lg", "fr_core_news_md", "fr_core_news_sm"):
        if spacy.util.is_package(model):
            return model
    return "fr_core_news_md"  # last resort — will fail clearly if missing


def create_nlp_engine():
    """Create spaCy NLP engine configured for French."""
    model_name = _detect_spacy_model()
    logger.info(f"Loading spaCy model: {model_name}")
    configuration = {
        "nlp_engine_name": "spacy",
        "models": [
            {"lang_code": "fr", "model_name": model_name},
        ],
    }
    provider = NlpEngineProvider(nlp_configuration=configuration)
    return provider.create_engine()


# ---------------------------------------------------------------------------
# Custom French Recognizers
# ---------------------------------------------------------------------------


def create_french_recognizers():
    """Create custom recognizers for French insurance documents."""
    recognizers = []

    # 1. French license plate (SIV format: AA-123-AA)
    recognizers.append(
        PatternRecognizer(
            supported_entity="FR_LICENSE_PLATE",
            name="FrenchLicensePlateRecognizer",
            supported_language="fr",
            patterns=[
                Pattern(
                    name="siv",
                    regex=r"\b[A-Z]{2}[-\s]?\d{3}[-\s]?[A-Z]{2}\b",
                    score=0.85,
                ),
                Pattern(
                    name="fni",
                    regex=r"\b\d{1,4}[-\s]?[A-Z]{1,3}[-\s]?\d{2,3}\b",
                    score=0.5,
                ),
            ],
            context=["immatriculation", "plaque", "vehicule", "voiture"],
        )
    )

    # 2. French driver license
    recognizers.append(
        PatternRecognizer(
            supported_entity="FR_DRIVER_LICENSE",
            name="FrenchDriverLicenseRecognizer",
            supported_language="fr",
            patterns=[
                Pattern(
                    name="permis_fr",
                    regex=r"\b\d{2}[A-Z]{2}\d{5}\b",
                    score=0.7,
                ),
            ],
            context=["permis", "conduire", "conducteur", "numero"],
        )
    )

    # 3. French SIRET/SIREN
    recognizers.append(
        PatternRecognizer(
            supported_entity="FR_SIRET",
            name="FrenchSIRETRecognizer",
            supported_language="fr",
            patterns=[
                Pattern(
                    name="siret",
                    regex=r"\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b",
                    score=0.7,
                ),
                Pattern(
                    name="siren",
                    regex=r"\b\d{3}\s?\d{3}\s?\d{3}\b",
                    score=0.35,
                ),
            ],
            context=["siret", "siren", "entreprise", "societe", "denomination"],
        )
    )

    # 4. French date of birth (DD/MM/YYYY near birth context)
    # Score 0.25 = below threshold without context; context boost raises it above 0.4
    # Year range 1930-2020 limits to plausible birth years (not contract/sinistre dates)
    recognizers.append(
        PatternRecognizer(
            supported_entity="DATE_OF_BIRTH",
            name="FrenchDateOfBirthRecognizer",
            supported_language="fr",
            patterns=[
                Pattern(
                    name="dob_fr",
                    regex=r"\b(0[1-9]|[12]\d|3[01])/(0[1-9]|1[0-2])/((?:19[3-9]\d|200\d|201\d|202[0-5]))\b",
                    score=0.25,
                ),
            ],
            context=[
                "ne", "nee", "naissance", "date de naissance",
                "anniversaire", "souscripteur", "conducteur", "titulaire",
            ],
        )
    )

    # 5. French phone numbers
    recognizers.append(
        PatternRecognizer(
            supported_entity="PHONE_NUMBER",
            name="FrenchPhoneRecognizer",
            supported_language="fr",
            patterns=[
                Pattern(
                    name="fr_national",
                    regex=r"\b0[1-9][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b",
                    score=0.7,
                ),
                Pattern(
                    name="fr_intl",
                    regex=r"\b\+33[\s.-]?[1-9][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b",
                    score=0.85,
                ),
            ],
            context=["telephone", "tel", "portable", "mobile", "appeler", "numero"],
        )
    )

    # 6. French national ID
    recognizers.append(
        PatternRecognizer(
            supported_entity="FR_NATIONAL_ID",
            name="FrenchNationalIDRecognizer",
            supported_language="fr",
            patterns=[
                Pattern(
                    name="cni",
                    regex=r"\b\d{4}\s?\d{4}\s?\d{4}\b",
                    score=0.25,
                ),
            ],
            context=["carte", "identite", "cni", "piece"],
        )
    )

    return recognizers


# ---------------------------------------------------------------------------
# Engine Initialization
# ---------------------------------------------------------------------------

logger.info("Initializing Presidio engines...")

nlp_engine = create_nlp_engine()
logger.info("NLP engine initialized")

# Create registry and add custom recognizers
registry = RecognizerRegistry(supported_languages=["fr", "en"])
registry.load_predefined_recognizers(
    nlp_engine=nlp_engine,
    languages=["fr", "en"],
)

for recognizer in create_french_recognizers():
    registry.add_recognizer(recognizer)
    logger.info(f"Registered custom recognizer: {recognizer.name}")

# Create analyzer and anonymizer
analyzer = AnalyzerEngine(
    nlp_engine=nlp_engine,
    registry=registry,
    supported_languages=["fr", "en"],
)

anonymizer = AnonymizerEngine()

logger.info("Presidio engines initialized successfully")

# ---------------------------------------------------------------------------
# Flask App
# ---------------------------------------------------------------------------

app = Flask(__name__)


# In-memory mapping store (per-request UUID → mapping)
# In production, consider Redis for multi-process setups
mapping_store: dict[str, dict[str, str]] = {}


def generate_placeholder(entity_type: str, counter: dict) -> str:
    """Generate a readable placeholder like [PERSON_1], [LOCATION_2]."""
    count = counter.get(entity_type, 0) + 1
    counter[entity_type] = count
    return f"[{entity_type}_{count}]"


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "service": "presidio-alxor",
        "language": "fr",
        "entities_anonymized": ENTITIES_TO_ANONYMIZE,
        "entities_kept": ENTITIES_TO_KEEP,
        "score_threshold": SCORE_THRESHOLD,
    })


@app.route("/entities", methods=["GET"])
def list_entities():
    """List all supported entity types."""
    return jsonify({
        "anonymized": ENTITIES_TO_ANONYMIZE,
        "kept_intact": ENTITIES_TO_KEEP,
        "all_detected": ALL_ENTITIES,
    })


@app.route("/analyze", methods=["POST"])
def analyze_text():
    """
    Detect PII in text without anonymizing.
    Useful for debugging and audit.

    Request body:
    {
        "text": "Jean Dupont habite au 12 rue de Paris",
        "language": "fr",           // optional, default "fr"
        "entities": ["PERSON"],     // optional, default: all
        "score_threshold": 0.4      // optional
    }
    """
    data = request.get_json(force=True)
    text = data.get("text", "")
    language = data.get("language", "fr")
    entities = data.get("entities", ALL_ENTITIES)
    threshold = data.get("score_threshold", SCORE_THRESHOLD)

    if not text:
        return jsonify({"error": "Missing 'text' field"}), 400

    results = analyzer.analyze(
        text=text,
        language=language,
        entities=entities,
        score_threshold=threshold,
    )
    results = post_filter_results(results, text)

    findings = []
    for r in results:
        findings.append({
            "entity_type": r.entity_type,
            "start": r.start,
            "end": r.end,
            "score": round(r.score, 3),
            "text": text[r.start:r.end],
        })

    return jsonify({
        "text": text,
        "findings": findings,
        "count": len(findings),
    })


def normalize_json_text(text):
    """If text is compact JSON, pretty-print it so NLP has better context for NER."""
    stripped = text.strip()
    if stripped.startswith("{") and stripped.endswith("}"):
        try:
            parsed = json.loads(stripped)
            pretty = json.dumps(parsed, indent=2, ensure_ascii=False)
            return pretty, True
        except (json.JSONDecodeError, ValueError):
            pass
    return text, False


@app.route("/anonymize", methods=["POST"])
def anonymize_text():
    """
    Anonymize PII in text with reversible placeholders.

    Request body:
    {
        "text": "Le souscripteur Jean Dupont ne le 15/03/1985...",
        "language": "fr",
        "score_threshold": 0.4
    }

    Response:
    {
        "anonymized_text": "Le souscripteur [PERSON_1] ne le [DATE_OF_BIRTH_1]...",
        "mapping_id": "uuid-xxx",
        "mapping": {"[PERSON_1]": "Jean Dupont", "[DATE_OF_BIRTH_1]": "15/03/1985"},
        "entities_found": [...]
    }
    """
    data = request.get_json(force=True)
    text = data.get("text", "")
    language = data.get("language", "fr")
    threshold = data.get("score_threshold", SCORE_THRESHOLD)

    if not text:
        return jsonify({"error": "Missing 'text' field"}), 400

    # Normalize JSON for better NLP detection
    text, was_json = normalize_json_text(text)

    # Step 1: Analyze to find PII
    results = analyzer.analyze(
        text=text,
        language=language,
        entities=ALL_ENTITIES,
        score_threshold=threshold,
    )
    results = post_filter_results(results, text)

    # Step 2: Separate entities to anonymize vs keep
    kept = [r for r in results if r.entity_type in ENTITIES_TO_KEEP]

    # Step 2b: Remove any anonymize-candidate that overlaps a kept entity
    # This ensures business data (e.g. license plates) is never masked,
    # even when spaCy also tags the same span as LOCATION/PERSON.
    def overlaps_kept(candidate):
        for k in kept:
            if candidate.start < k.end and candidate.end > k.start:
                return True
        return False

    to_anonymize = [
        r for r in results
        if r.entity_type in ENTITIES_TO_ANONYMIZE and not overlaps_kept(r)
    ]

    # Step 3: Build mapping with readable placeholders
    # Sort by position (end→start) to replace from end first
    to_anonymize.sort(key=lambda r: r.start)

    mapping = {}
    reverse_mapping = {}  # placeholder → original
    counter: dict[str, int] = {}
    anonymized = text

    # Replace from end to preserve positions
    for result in sorted(to_anonymize, key=lambda r: r.start, reverse=True):
        original = text[result.start:result.end]

        # Check if we already have a placeholder for this exact value
        existing_placeholder = None
        for ph, orig in reverse_mapping.items():
            if orig == original:
                existing_placeholder = ph
                break

        if existing_placeholder:
            placeholder = existing_placeholder
        else:
            placeholder = generate_placeholder(result.entity_type, counter)
            reverse_mapping[placeholder] = original

        anonymized = anonymized[:result.start] + placeholder + anonymized[result.end:]
        mapping[placeholder] = original

    # Second pass: replace any remaining literal occurrences of detected values
    # (NER may miss duplicates; regex recognizers may miss instances without context)
    for placeholder, original in reverse_mapping.items():
        if original and original not in ("null", "true", "false") and len(original) >= PERSON_MIN_LENGTH:
            anonymized = anonymized.replace(original, placeholder)

    # Generate a unique mapping ID for deanonymization
    mapping_id = str(uuid.uuid4())
    mapping_store[mapping_id] = reverse_mapping

    # Limit store size (keep last 1000 mappings)
    if len(mapping_store) > 1000:
        oldest_keys = list(mapping_store.keys())[:500]
        for k in oldest_keys:
            del mapping_store[k]

    entities_found = []
    for r in to_anonymize:
        entities_found.append({
            "entity_type": r.entity_type,
            "score": round(r.score, 3),
            "original": text[r.start:r.end],
        })

    entities_kept_info = []
    for r in kept:
        entities_kept_info.append({
            "entity_type": r.entity_type,
            "score": round(r.score, 3),
            "value": text[r.start:r.end],
            "reason": "business_data_kept_intact",
        })

    logger.info(
        f"Anonymized {len(to_anonymize)} entities, kept {len(kept)} intact. "
        f"Mapping ID: {mapping_id}"
    )

    return jsonify({
        "anonymized_text": anonymized,
        "mapping_id": mapping_id,
        "mapping": reverse_mapping,
        "entities_found": entities_found,
        "entities_kept": entities_kept_info,
        "stats": {
            "total_detected": len(results),
            "anonymized": len(to_anonymize),
            "kept_intact": len(kept),
        },
    })


@app.route("/deanonymize", methods=["POST"])
def deanonymize():
    """
    Restore original values in extracted JSON data.

    Request body (option A - with mapping_id):
    {
        "data": {"souscripteur_nom_complet": "[PERSON_1]", ...},
        "mapping_id": "uuid-xxx"
    }

    Request body (option B - with explicit mapping):
    {
        "data": {"souscripteur_nom_complet": "[PERSON_1]", ...},
        "mapping": {"[PERSON_1]": "Jean Dupont"}
    }

    Response:
    {
        "data": {"souscripteur_nom_complet": "Jean Dupont", ...},
        "replacements_made": 3
    }
    """
    req = request.get_json(force=True)
    data = req.get("data")
    mapping_id = req.get("mapping_id")
    explicit_mapping = req.get("mapping")

    if data is None:
        return jsonify({"error": "Missing 'data' field"}), 400

    # Get mapping
    if explicit_mapping:
        mapping = explicit_mapping
    elif mapping_id and mapping_id in mapping_store:
        mapping = mapping_store[mapping_id]
    else:
        return jsonify({
            "error": "No mapping found. Provide 'mapping' or valid 'mapping_id'",
        }), 400

    # Recursively replace placeholders in any data structure
    replacements_count = [0]

    def restore(obj: Any) -> Any:
        if isinstance(obj, str):
            result = obj
            for placeholder, original in mapping.items():
                if placeholder in result:
                    result = result.replace(placeholder, original)
                    replacements_count[0] += 1
            return result
        elif isinstance(obj, dict):
            return {k: restore(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [restore(item) for item in obj]
        return obj

    restored_data = restore(data)

    # Clean up mapping from store
    if mapping_id and mapping_id in mapping_store:
        del mapping_store[mapping_id]

    logger.info(f"Deanonymized: {replacements_count[0]} replacements made")

    return jsonify({
        "data": restored_data,
        "replacements_made": replacements_count[0],
    })


@app.route("/anonymize_for_gemini", methods=["POST"])
def anonymize_for_gemini():
    """
    Specialized endpoint for Alxor RI extraction workflow.
    Takes the text content extracted from PDF (or the system prompt context)
    and returns anonymized version + mapping for later deanonymization.

    This is the main endpoint called by n8n before the Gemini API call.

    Request body:
    {
        "text": "text content from PDF or prompt context",
        "language": "fr"
    }

    Response:
    {
        "anonymized_text": "...",
        "mapping": {...},
        "mapping_id": "uuid",
        "stats": {...}
    }
    """
    # Same as /anonymize but with optimized defaults for Gemini workflow
    data = request.get_json(force=True)
    text = data.get("text", "")
    language = data.get("language", "fr")

    if not text:
        return jsonify({"error": "Missing 'text' field"}), 400

    # Normalize JSON for better NLP detection
    text, was_json = normalize_json_text(text)

    # Use slightly higher threshold for Gemini context (reduce false positives)
    threshold = data.get("score_threshold", 0.45)

    results = analyzer.analyze(
        text=text,
        language=language,
        entities=ALL_ENTITIES,
        score_threshold=threshold,
    )
    results = post_filter_results(results, text)

    kept = [r for r in results if r.entity_type in ENTITIES_TO_KEEP]

    def overlaps_kept(candidate):
        for k in kept:
            if candidate.start < k.end and candidate.end > k.start:
                return True
        return False

    to_anonymize = [
        r for r in results
        if r.entity_type in ENTITIES_TO_ANONYMIZE and not overlaps_kept(r)
    ]

    to_anonymize.sort(key=lambda r: r.start)

    reverse_mapping = {}
    counter: dict[str, int] = {}
    anonymized = text

    for result in sorted(to_anonymize, key=lambda r: r.start, reverse=True):
        original = text[result.start:result.end]

        existing = None
        for ph, orig in reverse_mapping.items():
            if orig == original:
                existing = ph
                break

        placeholder = existing or generate_placeholder(result.entity_type, counter)
        if not existing:
            reverse_mapping[placeholder] = original

        anonymized = anonymized[:result.start] + placeholder + anonymized[result.end:]

    # Second pass: sweep for remaining literal occurrences of detected values
    for placeholder, original in reverse_mapping.items():
        if original and len(original) >= PERSON_MIN_LENGTH:
            anonymized = anonymized.replace(original, placeholder)

    mapping_id = str(uuid.uuid4())
    mapping_store[mapping_id] = reverse_mapping

    if len(mapping_store) > 1000:
        oldest = list(mapping_store.keys())[:500]
        for k in oldest:
            del mapping_store[k]

    logger.info(
        f"[Gemini prep] Anonymized {len(to_anonymize)} PII entities. "
        f"Mapping ID: {mapping_id}"
    )

    return jsonify({
        "anonymized_text": anonymized,
        "mapping": reverse_mapping,
        "mapping_id": mapping_id,
        "stats": {
            "entities_anonymized": len(to_anonymize),
            "entities_types": list(set(r.entity_type for r in to_anonymize)),
        },
    })


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logger.info(f"Starting Presidio API on {HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=(LOG_LEVEL == "DEBUG"))
