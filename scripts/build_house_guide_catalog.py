#!/usr/bin/env python3
"""Build guide-catalog.json from extracted PDF text (structured blocks, no secrets)."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
EXTRACTED_TEXT = ROOT / "src/content/houseguide/source/extracted-text.txt"
CATALOG_OUT = ROOT / "src/content/houseguide/guide-catalog.json"

# Generic shapes that are safe to spell out: no household value is embedded here.
FORBIDDEN_PATTERNS = [
    r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}",
    r"\b07\d{9}\b",
    r"\b\+44\s?7\d{9}\b",
]

# The household's Wi-Fi credentials and postcode are held as SHA-256 digests so
# this file cannot leak the values it guards against. Public venue postcodes in
# the local-area guide are expected and allowed, which is why only the specific
# household values are listed.
#   python3 -c "import hashlib;print(hashlib.sha256(b'VALUE').hexdigest())"
FORBIDDEN_TOKEN_HASHES = {
    "569aec22ee70c4b310b9b3d33090d350941742b8b936671ef351595f05382184",
    "e16fb790ce2520cedac8a5c32a9c8d748ca956c2f053fe524bcd0ae1d9841859",
    "1cce73b769492b5272a5ff918c29d0a2774c3195155e1e0d266492f5fec0e489",
}

# Multi-word values (the household street address) hashed after lowercasing and
# collapsing whitespace.
FORBIDDEN_PHRASE_HASHES = {
    "4d90ee3d8b8376e3b87bd348fa0fb7740dd84e6d22a1e2e9a49acaf001012128",
}
FORBIDDEN_PHRASE_WORDS = 5

POSTCODE_RE = re.compile(r"\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b")
WORD_RE = re.compile(r"[A-Za-z0-9]+")

FORBIDDEN_LITERAL = "Content coming soon."


def _topic(
    id_: str,
    title: str,
    subtitle: str,
    summary: str,
    blocks: list[dict[str, Any]],
    search_terms: list[str],
    actions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "id": id_,
        "title": title,
        "subtitle": subtitle,
        "summary": summary,
        "searchTerms": search_terms,
        "blocks": blocks,
        "actions": actions or [],
    }


def _protected(kind: str, label: str, key: str) -> dict[str, Any]:
    return {"type": "protected", "kind": kind, "label": label, "key": key}


def _place(
    name: str,
    address: str,
    description: str,
    *,
    dog_friendly: bool | None = None,
    website: str | None = None,
) -> dict[str, Any]:
    block: dict[str, Any] = {
        "type": "place",
        "name": name,
        "address": address,
        "description": description,
    }
    if dog_friendly is not None:
        block["dogFriendly"] = dog_friendly
    if website:
        block["website"] = website
    return block


def media_map() -> dict[str, dict[str, str]]:
    return {
        "fuse-box": {"file": "fuse-box.jpg", "alt": "Consumer unit in the garage"},
        "water-stop-tap": {
            "file": "water-stop-tap.jpg",
            "alt": "Main water stop tap under the kitchen sink",
        },
        "tv-remote-source-button": {
            "file": "tv-remote-source-button.jpg",
            "alt": "LG remote with Source button highlighted",
        },
        "ev-charger-lockbox": {
            "file": "ev-charger-lockbox.jpg",
            "alt": "EV charger, outdoor socket and key lockbox",
        },
        "garden-hose-bins": {
            "file": "garden-hose-bins.jpg",
            "alt": "Retractable hose, outside tap and wheelie bins",
        },
        "weber-bbq": {"file": "weber-bbq.jpg", "alt": "Weber charcoal BBQ in the garden"},
        "hot-water-machine-controls": {
            "file": "hot-water-machine-controls.jpg",
            "alt": "Hot and cold filtered water machine controls",
        },
    }


def category_arrival() -> dict[str, Any]:
    return {
        "id": "arrival",
        "title": "Arrival",
        "cardSubtitle": "Directions • Keys • EV charging",
        "iconId": "key-round",
        "accent": "#7eab90",
        "searchTerms": ["arrival", "finding", "parking", "lockbox", "directions"],
        "topics": [
            _topic(
                "finding-the-house",
                "Finding the House",
                "Sat nav and the side road",
                "How to reach the property",
                [
                    {
                        "type": "text",
                        "content": (
                            "Sat nav will get you to Wagtail Road. The house is down a small "
                            "side road opposite number 12 — drive to the end to reach the property."
                        ),
                    },
                    _protected("address", "Full address", "address.full"),
                    {"type": "tip", "content": "Google Maps works well for the last few metres."},
                ],
                ["finding", "address", "directions", "sat nav", "wagtail"],
            ),
            _topic(
                "parking-and-access",
                "Parking and Access",
                "Where to leave the car",
                "Parking on arrival",
                [
                    {
                        "type": "text",
                        "content": (
                            "Use the small road at the end of Wagtail Road. "
                            "There is space to park while you unload."
                        ),
                    },
                ],
                ["parking", "access", "car"],
            ),
            _topic(
                "spare-key-lockbox",
                "Spare Key and Lockbox",
                "Secure spare key",
                "Lockbox on the left of the house",
                [
                    {
                        "type": "heroImage",
                        "mediaId": "ev-charger-lockbox",
                        "caption": "Key lockbox on the left-hand side of the house",
                    },
                    {
                        "type": "text",
                        "content": (
                            "A secure key lock box is on the left-hand side as you face the front. "
                            "The access code is shared separately on arrival."
                        ),
                    },
                    _protected("lockbox", "Lockbox code", "lockbox.code"),
                    {
                        "type": "note",
                        "content": "Return the spare key to the lock box before you leave.",
                    },
                ],
                ["lockbox", "spare key", "key safe", "code"],
            ),
            _topic(
                "leaving-the-house",
                "Leaving the House",
                "Before you go out",
                "Lock up when you leave",
                [
                    {
                        "type": "steps",
                        "heading": "Before you go",
                        "steps": [
                            "Lock the front door with the key (Yale-style lock — use the key).",
                            "Ensure patio doors are secured as needed.",
                            "Check Scooter is comfortable if she is staying in.",
                        ],
                    },
                ],
                ["leaving", "lock up", "going out"],
            ),
            _topic(
                "ev-charger-outside-socket",
                "EV Charger and Outside Socket",
                "Front of the house",
                "Charging and outdoor power",
                [
                    {
                        "type": "heroImage",
                        "mediaId": "ev-charger-lockbox",
                        "caption": "EV charger and outdoor double socket at the front",
                    },
                    {
                        "type": "text",
                        "content": (
                            "An EV charger is at the front of the house. "
                            "You're welcome to use it — please contact us beforehand so we can explain how it works."
                        ),
                    },
                    {
                        "type": "note",
                        "content": "There is also an outdoor double socket at the front if you need outdoor power.",
                    },
                ],
                ["ev", "charger", "electric car", "socket", "outside plug"],
            ),
            _topic(
                "public-transport-taxis",
                "Public Transport and Taxis",
                "Getting around without a car",
                "Buses, trains and taxis",
                [
                    {
                        "type": "keyValues",
                        "heading": "Buses",
                        "items": [
                            {
                                "label": "Nearest stops",
                                "value": "Around a 15-minute walk — No. 7 and No. 8 to Waterlooville and Portsmouth",
                            },
                        ],
                    },
                    {
                        "type": "keyValues",
                        "heading": "Trains",
                        "items": [
                            {"label": "Havant", "value": "About 15 minutes by car"},
                            {"label": "Petersfield", "value": "About 20 minutes by car"},
                        ],
                    },
                    {
                        "type": "tip",
                        "content": "Google Maps has live bus times. Uber is widely available; Vezu is a reliable local taxi firm.",
                    },
                ],
                ["bus", "train", "taxi", "uber", "transport"],
            ),
        ],
    }


def category_scooter() -> dict[str, Any]:
    return {
        "id": "scooter",
        "title": "Scooter",
        "cardSubtitle": "Feeding • Walks • Bedtime",
        "iconId": "dog",
        "accent": "#ff9f43",
        "searchTerms": ["scooter", "dog", "pet", "jack russell"],
        "topics": [
            _topic(
                "at-a-glance",
                "At a Glance",
                "Jack Russell, 5 years",
                "Quick facts about Scooter",
                [
                    {
                        "type": "keyValues",
                        "items": [
                            {"label": "Breed", "value": "Jack Russell Terrier"},
                            {"label": "Age", "value": "5"},
                            {"label": "Health", "value": "Excellent — vaccinated, no medication"},
                        ],
                    },
                    {
                        "type": "text",
                        "content": (
                            "She is full of energy, loves people, and will happily become your shadow. "
                            "Sofas and beds are allowed."
                        ),
                    },
                ],
                ["scooter", "dog", "overview", "pet"],
            ),
            _topic(
                "feeding",
                "Feeding",
                "Twice daily meals",
                "Morning and evening feeding",
                [
                    {
                        "type": "steps",
                        "heading": "Each meal",
                        "steps": [
                            "1 scoop of dry food",
                            "¼ tub of wet food",
                            "Feed once in the morning and once in the evening",
                        ],
                    },
                    {
                        "type": "tip",
                        "content": (
                            "She may not eat straight away — leave food down and refresh at the next meal if anything is left."
                        ),
                    },
                ],
                ["dog food", "feed scooter", "feeding", "breakfast", "dinner", "meals"],
            ),
            _topic(
                "walks-exercise",
                "Walks and Exercise",
                "Ball games and recall",
                "Walks and play",
                [
                    {
                        "type": "text",
                        "content": (
                            "No strict walk routine — whenever you fancy going out, she'll be delighted. "
                            "Excellent recall off-lead in open spaces."
                        ),
                    },
                    {
                        "type": "warning",
                        "heading": "Near roads",
                        "content": "She is not very good near roads — use a lead for pavement walks.",
                    },
                    {
                        "type": "tip",
                        "content": "She loves chasing a tennis ball; bringing it back is optional!",
                    },
                ],
                ["walk", "walks", "exercise", "ball", "lead", "recall"],
            ),
            _topic(
                "bedtime",
                "Bedtime",
                "Crate routine",
                "Settling Scooter at night",
                [
                    {
                        "type": "steps",
                        "heading": "Bedtime phrase",
                        "steps": [
                            'Tell Scooter: "It\'s bedtime for dogs."',
                            "She usually heads to the back door for a last toilet break.",
                            "Then into her crate.",
                            'If she whines briefly, a calm "It\'s bedtime." usually settles her.',
                        ],
                    },
                ],
                ["bedtime", "crate", "night", "sleep"],
                actions=[{"type": "alexa", "buttonId": 1, "label": "Alexa bedtime routine"}],
            ),
            _topic(
                "toilet-routine",
                "Toilet Routine",
                "Bells at the back door",
                "Letting Scooter out",
                [
                    {
                        "type": "text",
                        "content": (
                            "She nudges the bell hanging by the back door when she wants to go out. "
                            "When ready to come back in, she presses the wireless dog doorbell outside."
                        ),
                    },
                ],
                ["toilet", "bells", "back door", "doorbell", "outside"],
            ),
            _topic(
                "grooming-muddy-walks",
                "Grooming and Muddy Walks",
                "After rolling in the wrong stuff",
                "Shampoo and drying",
                [
                    {
                        "type": "warning",
                        "content": (
                            "She sometimes rolls in deer or fox droppings — she needs a shower if that happens."
                        ),
                    },
                    {
                        "type": "text",
                        "content": (
                            "Dog shampoo is in the en-suite bathroom. Towel dry, then use the hairdryer. "
                            "More common in wet winter weather; she dislikes rain."
                        ),
                    },
                ],
                ["grooming", "shower", "muddy", "smell", "shampoo"],
            ),
            _topic(
                "leaving-scooter-alone",
                "Leaving Scooter Alone",
                "Short outings",
                "She can stay home briefly",
                [
                    {
                        "type": "text",
                        "content": (
                            "Scooter can be left on her own for a few hours while you explore. "
                            "She loves curling up on the sofa after a walk."
                        ),
                    },
                ],
                ["alone", "leave", "out", "hours"],
            ),
            _topic(
                "personality",
                "Personality",
                "Calm and affectionate",
                "What to expect",
                [
                    {
                        "type": "text",
                        "content": (
                            "Happy, affectionate, people-friendly and pet-friendly. "
                            "Can be nervous with new noises but settles quickly. "
                            "Loves cuddles and blankets — morning bed cuddles welcome if you're happy for her to join."
                        ),
                    },
                ],
                ["personality", "cuddles", "behaviour", "nervous"],
            ),
            _topic(
                "veterinary-help",
                "Veterinary Help",
                "Local vet details",
                "If Scooter needs a vet",
                [
                    {
                        "type": "contact",
                        "heading": "Vets 4 Pets",
                        "items": [
                            {
                                "label": "Address",
                                "value": "2 Hambledon Road, Waterlooville (inside Pets at Home)",
                            },
                            {"label": "Phone", "value": "023 9225 6510", "href": "tel:02392256510"},
                            {"label": "Hours", "value": "9am–7pm Mon–Sat; closed Sunday"},
                            {
                                "label": "Out of hours",
                                "value": "023 9225 6510",
                                "href": "tel:02392256510",
                            },
                        ],
                    },
                ],
                ["vet", "veterinary", "pets at home", "scooter ill"],
                actions=[{"type": "navigate", "topicId": "vet", "label": "House emergency vet info"}],
            ),
        ],
    }


def category_kitchen() -> dict[str, Any]:
    return {
        "id": "kitchen",
        "title": "Kitchen",
        "cardSubtitle": "Water machine • Laundry • Bins",
        "iconId": "chef-hat",
        "accent": "#f4b64f",
        "searchTerms": ["kitchen", "cook", "appliances", "food"],
        "topics": [
            _topic(
                "hot-and-cold-water-machine",
                "Hot and Cold Water Machine",
                "No kettle — filtered instant hot and cold",
                "Boiling and chilled water on tap",
                [
                    {
                        "type": "heroImage",
                        "mediaId": "hot-water-machine-controls",
                        "caption": "Button layout on the water machine",
                    },
                    {
                        "type": "note",
                        "content": "There is no kettle — use this machine for tea, coffee and cooking water.",
                    },
                    {
                        "type": "steps",
                        "heading": "Hot water",
                        "steps": [
                            "Press the bottom-left button to heat the water.",
                            "When ready, press the red button above it for about one mug of boiling water.",
                            "If unused for a while, allow a minute or two to heat up.",
                        ],
                    },
                    {
                        "type": "steps",
                        "heading": "Cold filtered water",
                        "steps": [
                            "Top blue button — one glass of chilled water.",
                            "Bottom blue button — about 750 ml (ideal for a jug).",
                        ],
                    },
                    {
                        "type": "warning",
                        "heading": "Important",
                        "content": (
                            "The machine does not stop automatically when your cup or jug is full. "
                            "Press any button to stop the flow before it overflows."
                        ),
                    },
                ],
                [
                    "hot water",
                    "kettle",
                    "tea",
                    "coffee",
                    "boiling water",
                    "hot tap",
                    "cold water",
                    "filtered",
                ],
            ),
            _topic(
                "dishwasher",
                "Dishwasher",
                "Program 3 works best",
                "Using the dishwasher",
                [
                    {
                        "type": "text",
                        "content": "Use program 3 for best results. Tablets are under the sink.",
                    },
                ],
                ["dishwasher", "dishes", "program 3"],
            ),
            _topic(
                "fridge-freezer",
                "Fridge and Freezer Space",
                "Your food storage",
                "What you can use",
                [
                    {
                        "type": "text",
                        "content": (
                            "The fridge by the washing machine off the kitchen is for your use, "
                            "plus the top two freezer drawers. "
                            "Please do not use the garage freezer or small fridge in the garage."
                        ),
                    },
                ],
                ["fridge", "freezer", "food storage"],
            ),
            _topic(
                "tea-coffee-basics",
                "Tea, Coffee and Cooking Basics",
                "Help yourself",
                "Pantry staples",
                [
                    {
                        "type": "text",
                        "content": (
                            "Tea, coffee, sugar and basics such as oil, herbs and spices are available — please help yourselves."
                        ),
                    },
                ],
                ["tea", "coffee", "sugar", "cooking", "oil", "spices"],
            ),
            _topic(
                "additional-appliances",
                "Additional Appliances",
                "Garage and cupboard extras",
                "Sandwich toaster, blender and more",
                [
                    {
                        "type": "text",
                        "content": (
                            "Feel free to use any appliance you need. "
                            "Tumble dryer, vacuum and mop are in the garage (door from the lounge). "
                            "Sandwich toaster and blender are under the air fryer cupboard."
                        ),
                    },
                ],
                ["air fryer", "blender", "sandwich toaster", "garage", "vacuum"],
            ),
            _topic(
                "washing-tumble-dryer",
                "Washing Machine and Tumble Dryer",
                "Laundry",
                "Washer in kitchen, dryer in garage",
                [
                    {
                        "type": "text",
                        "content": (
                            "Washing machine is in the kitchen. Tumble dryer is in the garage — access through the lounge."
                        ),
                    },
                ],
                ["washing", "laundry", "tumble dryer", "washer"],
            ),
            _topic(
                "rubbish-recycling",
                "Rubbish and Recycling",
                "Bins and collections",
                "Kitchen bin and wheelies",
                [
                    {
                        "type": "keyValues",
                        "heading": "Kitchen bin",
                        "items": [
                            {"label": "General waste", "value": "Top section"},
                            {"label": "Recycling", "value": "Bottom drawer"},
                        ],
                    },
                    {
                        "type": "text",
                        "content": "Spare liners are under the kitchen sink.",
                    },
                    {
                        "type": "heroImage",
                        "mediaId": "garden-hose-bins",
                        "caption": "Wheelie bins down the side of the house",
                    },
                    {
                        "type": "keyValues",
                        "heading": "Wheelie bins (side of house)",
                        "items": [
                            {"label": "Black bin", "value": "Recycling"},
                            {"label": "Green bin", "value": "General waste"},
                        ],
                    },
                    {
                        "type": "tip",
                        "content": (
                            "Collections are fortnightly on alternate weeks. "
                            "If your stay includes collection day, wheel the right bin to the end of the small road the evening before."
                        ),
                    },
                ],
                ["rubbish", "trash", "recycling", "wheelie bin", "bins"],
            ),
        ],
    }


def category_heating_utilities() -> dict[str, Any]:
    return {
        "id": "heating-utilities",
        "title": "Heating & Utilities",
        "cardSubtitle": "Nest • Hot water • Fuse box",
        "iconId": "flame",
        "accent": "#ff6b6b",
        "searchTerms": ["heating", "nest", "thermostat", "utilities", "hot water"],
        "topics": [
            _topic(
                "nest-heating",
                "Nest Heating Controls",
                "Lounge thermostat",
                "Turn heating on from Eco",
                [
                    {
                        "type": "steps",
                        "heading": "If Eco mode is showing",
                        "steps": [
                            "Press the centre of the Nest thermostat.",
                            "Select the Heating icon (three horizontal lines).",
                            "Press the centre again to enable heating.",
                        ],
                    },
                    {
                        "type": "text",
                        "content": (
                            "Outside scheduled times, turn the outer dial to your preferred temperature."
                        ),
                    },
                ],
                ["nest", "thermostat", "heating", "eco"],
                actions=[
                    {"type": "alexa", "buttonId": 7, "label": "Heat to 20°C"},
                    {"type": "alexa", "buttonId": 8, "label": "Heat to 9°C"},
                ],
            ),
            _topic(
                "heating-schedule",
                "Heating Schedule",
                "Automatic times",
                "When heating runs",
                [
                    {
                        "type": "keyValues",
                        "items": [
                            {"label": "Morning", "value": "06:45 – 08:30"},
                            {"label": "Evening", "value": "17:15 – 22:30"},
                        ],
                    },
                    {
                        "type": "warning",
                        "content": (
                            "If you manually turn heating on after 10:30 pm, please set the thermostat back to 9°C before bed."
                        ),
                    },
                ],
                ["heating schedule", "timer", "morning", "evening", "9 degrees"],
                actions=[{"type": "alexa", "buttonId": 8, "label": "Heat to 9°C"}],
            ),
            _topic(
                "hot-water-schedule",
                "Hot Water Schedule",
                "Automatic heating windows",
                "When hot water heats",
                [
                    {
                        "type": "keyValues",
                        "items": [
                            {"label": "Morning", "value": "06:00 – 06:30"},
                            {"label": "Evening", "value": "18:00 – 18:30"},
                        ],
                    },
                    {
                        "type": "note",
                        "content": "Outside these times the system heats more water automatically when needed.",
                    },
                ],
                ["hot water", "immersion", "schedule"],
            ),
            _topic(
                "water-stop-tap",
                "Water Stop Tap",
                "Kitchen cupboard",
                "Shut off the water supply",
                [
                    {
                        "type": "heroImage",
                        "mediaId": "water-stop-tap",
                        "caption": "Stop tap at the back of the cupboard under the kitchen sink",
                    },
                    {
                        "type": "location",
                        "heading": "Location",
                        "content": "Main stop tap under the kitchen sink — at the back of the cupboard.",
                    },
                ],
                ["stopcock", "stop cock", "water leak", "turn water off", "stop tap"],
                actions=[{"type": "navigate", "topicId": "water-emergency", "label": "Water emergency"}],
            ),
            _topic(
                "fuse-box",
                "Fuse Box",
                "Consumer unit in garage",
                "Electrical supply",
                [
                    {
                        "type": "heroImage",
                        "mediaId": "fuse-box",
                        "caption": "Consumer unit on the far wall of the garage",
                    },
                    {
                        "type": "text",
                        "content": "All circuits are clearly labelled.",
                    },
                ],
                ["fuse", "fuse box", "consumer unit", "electric", "trip"],
                actions=[{"type": "navigate", "topicId": "electrical-emergency", "label": "Electrical emergency"}],
            ),
            _topic(
                "lighting-alexa",
                "Lighting and Alexa Commands",
                "Voice lighting",
                "Useful Alexa phrases",
                [
                    {
                        "type": "collapsible",
                        "heading": "Downstairs and garage",
                        "content": '"Alexa, turn downstairs on." / off — same for garage lights.',
                    },
                    {
                        "type": "collapsible",
                        "heading": "Bedrooms",
                        "content": '"Alexa, bedroom lights on." / off',
                    },
                    {
                        "type": "tip",
                        "content": (
                            'At bedtime say "Alexa, bedtime." — turns off downstairs, garage and bedside lights and sets heating to 9°C overnight.'
                        ),
                    },
                ],
                ["lights", "alexa", "lighting", "downstairs", "bedtime"],
                actions=[
                    {"type": "alexa", "buttonId": 3, "label": "Downstairs on"},
                    {"type": "alexa", "buttonId": 1, "label": "Alexa bedtime"},
                ],
            ),
        ],
    }


def category_tv() -> dict[str, Any]:
    return {
        "id": "tv",
        "title": "TV & Entertainment",
        "cardSubtitle": "Apple TV • Streaming • Sonos",
        "iconId": "monitor",
        "accent": "#d16dff",
        "searchTerms": ["tv", "television", "netflix", "streaming", "sonos"],
        "topics": [
            _topic(
                "turning-on-tv",
                "Turning on the TV",
                "LG remote on the sofa table",
                "Power on and off",
                [
                    {
                        "type": "heroImage",
                        "mediaId": "tv-remote-source-button",
                        "caption": "LG remote beside the sofa",
                    },
                    {
                        "type": "steps",
                        "steps": ["Press the large red power button to turn the TV on and off."],
                    },
                ],
                ["tv", "television", "remote", "power"],
            ),
            _topic(
                "selecting-apple-tv",
                "Selecting Apple TV",
                "Input 3 via Source",
                "Watch streaming apps",
                [
                    {
                        "type": "heroImage",
                        "mediaId": "tv-remote-source-button",
                        "caption": "Source button below the navigation pad",
                    },
                    {
                        "type": "steps",
                        "heading": "Apple TV (Input 3)",
                        "steps": [
                            "Press the Source button (icon like a power cable beneath the four-way pad).",
                            "Select Input 3 – Apple TV.",
                        ],
                    },
                ],
                ["apple tv", "input 3", "source", "hdmi"],
                actions=[{"type": "alexa", "buttonId": 2, "label": "Watch movie"}],
            ),
            _topic(
                "streaming-services",
                "Streaming Services",
                "Apps on Apple TV",
                "Netflix, Prime, BBC and more",
                [
                    {
                        "type": "text",
                        "content": (
                            "Apple TV includes Netflix, Amazon Prime Video, Apple TV+, BBC iPlayer, ITVX, "
                            "Channel 4 and YouTube. Sign in with your own accounts if needed — sign out before you leave."
                        ),
                    },
                ],
                ["netflix", "prime", "iplayer", "youtube", "streaming"],
                actions=[{"type": "alexa", "buttonId": 2, "label": "Watch movie"}],
            ),
            _topic(
                "airplay",
                "AirPlay",
                "From iPhone, iPad or Mac",
                "Stream to the TV",
                [
                    {
                        "type": "text",
                        "content": "The lounge TV supports Apple AirPlay for streaming from your Apple devices.",
                    },
                ],
                ["airplay", "iphone", "ipad", "mac", "cast"],
            ),
            _topic(
                "sonos",
                "Sonos",
                "Speakers around the house",
                "Music and radio",
                [
                    {
                        "type": "steps",
                        "steps": [
                            "Connect to the house Wi-Fi.",
                            "Open the Sonos app — speakers should appear automatically.",
                            "Apple Music, Spotify, BBC Sounds and Global Player are available.",
                        ],
                    },
                ],
                ["sonos", "music", "spotify", "speakers", "radio"],
            ),
            _topic(
                "alexa-lighting-commands",
                "Alexa Lighting Commands",
                "While watching TV",
                "Quick voice lighting",
                [
                    {
                        "type": "text",
                        "content": (
                            'Try "Alexa, turn downstairs on/off", "Alexa, garage on/off", '
                            'and "Alexa, bedroom lights on/off".'
                        ),
                    },
                ],
                ["alexa", "lights", "downstairs"],
                actions=[{"type": "alexa", "buttonId": 3, "label": "Downstairs on"}],
            ),
            _topic(
                "bedtime-routine",
                "Bedtime Routine",
                "One phrase for lights and heat",
                "End of evening",
                [
                    {
                        "type": "text",
                        "content": (
                            'Say "Alexa, bedtime." This turns off downstairs, garage and bedside lights '
                            "and sets heating to 9°C overnight."
                        ),
                    },
                ],
                ["bedtime", "night", "alexa routine"],
                actions=[{"type": "alexa", "buttonId": 1, "label": "Alexa bedtime"}],
            ),
        ],
    }


def category_bathrooms() -> dict[str, Any]:
    return {
        "id": "bathrooms",
        "title": "Bathrooms",
        "cardSubtitle": "Towels • Showers • Supplies",
        "iconId": "shower-head",
        "accent": "#4da8ff",
        "searchTerms": ["bathroom", "shower", "bath", "towels"],
        "topics": [
            _topic(
                "towels-supplies",
                "Towels and Supplies",
                "Fresh for your stay",
                "Where to find extras",
                [
                    {
                        "type": "text",
                        "content": (
                            "Fresh towels are provided. Spare toilet rolls are in the downstairs toilet basket "
                            "and in the top drawers of the storage unit."
                        ),
                    },
                ],
                ["towels", "toilet roll", "supplies"],
            ),
            _topic(
                "en-suite-shower",
                "En-suite Shower",
                "Master bedroom",
                "Using the en-suite",
                [
                    {
                        "type": "warning",
                        "content": (
                            "Angle the shower head towards the shower door, not the back wall — "
                            "it can leak if directed at the rear of the enclosure."
                        ),
                    },
                ],
                ["en-suite", "master shower", " ensuite"],
            ),
            _topic(
                "family-bathroom",
                "Family Bathroom",
                "Upstairs bath",
                "Family bathroom upstairs",
                [
                    {"type": "text", "content": "Upstairs family bathroom with a bath. Downstairs toilet also available."},
                ],
                ["bath", "family bathroom", "upstairs"],
            ),
            _topic(
                "hairdryer",
                "Hairdryer",
                "Master bedroom",
                "Guest hairdryer",
                [
                    {
                        "type": "location",
                        "heading": "Location",
                        "content": "On top of the wooden storage box in the corner of the master bedroom.",
                    },
                ],
                ["hairdryer", "dry hair"],
            ),
            _topic(
                "shower-leak-warning",
                "Shower Leak Warning",
                "En-suite only",
                "Avoid leaks",
                [
                    {
                        "type": "warning",
                        "heading": "Shower direction",
                        "content": "Point the en-suite shower head at the door side to prevent leaks at the back wall.",
                    },
                ],
                ["leak", "shower leak", "en-suite"],
            ),
            _topic(
                "extractor-fans",
                "Extractor Fans",
                "Linked to lights",
                "Ventilation",
                [
                    {
                        "type": "note",
                        "content": "The extractor fan runs with the bathroom light and continues briefly after the light is switched off.",
                    },
                ],
                ["extractor", "fan", "steam"],
            ),
        ],
    }


def category_garden() -> dict[str, Any]:
    return {
        "id": "garden",
        "title": "Garden",
        "cardSubtitle": "Seating • BBQ • Watering",
        "iconId": "trees",
        "accent": "#28d17c",
        "searchTerms": ["garden", "outside", "bbq", "patio"],
        "topics": [
            _topic(
                "garden-seating",
                "Garden Seating",
                "Make yourself at home outside",
                "Seating and dining",
                [
                    {
                        "type": "text",
                        "content": (
                            "Use outdoor seating, cushions, parasols and the dining area. "
                            "Cushions may be left out in summer."
                        ),
                    },
                ],
                ["garden", "seating", "patio", "outside"],
            ),
            _topic(
                "watering-plants",
                "Watering Plants",
                "Outdoor plants in dry weather",
                "When to water",
                [
                    {
                        "type": "text",
                        "content": (
                            "Indoor plants are artificial — no watering needed. "
                            "If the weather has been dry for a few days, please water outdoor plants."
                        ),
                    },
                    {
                        "type": "note",
                        "content": "No hosepipe ban for Portsmouth Water users in Hampshire (Southern Water area may differ).",
                    },
                ],
                ["watering", "plants", "garden plants"],
            ),
            _topic(
                "hose-outside-tap",
                "Hose and Outside Tap",
                "Back of the house",
                "Retractable hose",
                [
                    {
                        "type": "heroImage",
                        "mediaId": "garden-hose-bins",
                        "caption": "Hose on the back wall; tap down the side",
                    },
                    {
                        "type": "text",
                        "content": (
                            "Retractable hose mounted on the back of the house. Outside tap is down the side."
                        ),
                    },
                ],
                ["hose", "tap", "water garden"],
            ),
            _topic(
                "bbq",
                "BBQ",
                "Weber charcoal grill",
                "Using the barbecue",
                [
                    {
                        "type": "heroImage",
                        "mediaId": "weber-bbq",
                        "caption": "Weber charcoal BBQ",
                    },
                    {
                        "type": "text",
                        "content": "BBQ tongs are in the kitchen. Clean the grill once cool and replace the cover afterwards.",
                    },
                ],
                ["bbq", "barbecue", "weber", "grill"],
            ),
            _topic(
                "fire-pit",
                "Fire Pit",
                "STOVE fire pit",
                "Evenings outside",
                [
                    {
                        "type": "warning",
                        "content": "Fully extinguish the fire pit before leaving it unattended.",
                    },
                    {
                        "type": "note",
                        "content": "Close parasols after use when it is windy.",
                    },
                ],
                ["fire pit", "fire", "stove"],
            ),
            _topic(
                "parasols",
                "Parasols",
                "Wind care",
                "Protect parasols",
                [
                    {
                        "type": "tip",
                        "content": "Close parasols after use when the weather is windy.",
                    },
                ],
                ["parasol", "umbrella", "wind"],
            ),
            _topic(
                "outdoor-socket",
                "Outdoor Socket",
                "Front of house",
                "Double outdoor socket",
                [
                    {
                        "type": "text",
                        "content": "Outdoor double socket at the front of the house for outdoor equipment.",
                    },
                ],
                ["socket", "outside plug", "outdoor power"],
            ),
            _topic(
                "ev-charger-garden",
                "EV Charger",
                "Front of the property",
                "Same as arrival info",
                [
                    {
                        "type": "text",
                        "content": (
                            "EV charger at the front — contact us before use so we can explain operation."
                        ),
                    },
                ],
                ["ev", "charger", "electric car"],
                actions=[
                    {"type": "navigate", "topicId": "ev-charger-outside-socket", "label": "EV charger details"}
                ],
            ),
        ],
    }


def category_security() -> dict[str, Any]:
    return {
        "id": "security",
        "title": "Security",
        "cardSubtitle": "Locks • Keys • Checklist",
        "iconId": "shield",
        "accent": "#6f7b8f",
        "searchTerms": ["security", "lock", "keys", "doors"],
        "topics": [
            _topic(
                "front-door",
                "Front Door",
                "Key lock",
                "Locking the front door",
                [
                    {
                        "type": "text",
                        "content": "The front door has a key lock (not Yale) — lock with the key when you go out and at night.",
                    },
                ],
                ["front door", "key", "lock"],
            ),
            _topic(
                "patio-doors",
                "Patio Doors",
                "Back of the house",
                "Patio door key",
                [
                    {
                        "type": "note",
                        "content": "The key stays in the patio door lock — there is no spare for that lock.",
                    },
                ],
                ["patio", "back door", "doors"],
            ),
            _topic(
                "locking-up",
                "Locking Up",
                "Whenever you leave",
                "Secure the house",
                [
                    {
                        "type": "steps",
                        "steps": [
                            "Lock all doors when you leave the house.",
                            "Lock doors before going to bed.",
                        ],
                    },
                ],
                ["locking up", "secure", "leave house"],
            ),
            _topic(
                "key-lockbox",
                "Key Lockbox",
                "Spare key storage",
                "Left side of the house",
                [
                    {
                        "type": "heroImage",
                        "mediaId": "ev-charger-lockbox",
                        "caption": "Lockbox location",
                    },
                    _protected("lockbox", "Lockbox code", "lockbox.code"),
                    {
                        "type": "note",
                        "content": "Return the spare key to the lock box before you leave.",
                    },
                ],
                ["lockbox", "spare key"],
            ),
            _topic(
                "restricted-room",
                "Restricted Room",
                "Study locked",
                "Rooms you can use",
                [
                    {
                        "type": "text",
                        "content": (
                            "You have access to every room except the study, which is locked. "
                            "The dining table is a good workspace if you need to work."
                        ),
                    },
                ],
                ["study", "locked room", "workspace"],
            ),
            _topic(
                "leaving-bedtime-checklist",
                "Leaving and Bedtime Checklist",
                "Doors and Scooter",
                "Quick security checklist",
                [
                    {
                        "type": "steps",
                        "steps": [
                            "Lock doors when leaving and at bedtime.",
                            'Tell Scooter "It\'s bedtime for dogs" when settling her.',
                            "Set heating to 9°C if you ran it manually late evening.",
                        ],
                    },
                ],
                ["checklist", "bedtime", "leaving"],
                actions=[{"type": "alexa", "buttonId": 1, "label": "Alexa bedtime"}],
            ),
        ],
    }


def category_wifi() -> dict[str, Any]:
    return {
        "id": "wifi",
        "title": "Wi-Fi",
        "cardSubtitle": "Connect • Coverage • Help",
        "iconId": "wifi",
        "accent": "#28d17c",
        "searchTerms": ["wifi", "wi-fi", "internet", "network"],
        "topics": [
            _topic(
                "connecting",
                "Connecting",
                "High-speed Wi-Fi",
                "Join the network",
                [
                    {
                        "type": "text",
                        "content": (
                            "Wi-Fi details are provided through secure house-sitter access — not stored in this guide."
                        ),
                    },
                    _protected("wifi", "Network name (SSID)", "wifi.ssid"),
                    _protected("wifi", "Password", "wifi.password"),
                ],
                ["wifi", "password", "ssid", "connect", "internet"],
            ),
            _topic(
                "coverage",
                "Coverage",
                "Whole house and garden",
                "Access points",
                [
                    {
                        "type": "text",
                        "content": (
                            "Access points throughout the house give strong coverage in every room and into the garden."
                        ),
                    },
                ],
                ["coverage", "signal", "garden wifi"],
            ),
            _topic(
                "troubleshooting",
                "Troubleshooting",
                "If connection fails",
                "Getting help",
                [
                    {
                        "type": "tip",
                        "content": "If you have trouble connecting, contact us — we're happy to help.",
                    },
                    _protected("contact", "Mark — phone", "contacts.mark.phone"),
                    _protected("contact", "Mark — email", "contacts.mark.email"),
                ],
                ["wifi problem", "no internet", "troubleshoot"],
            ),
            _topic(
                "qr-code-placeholder",
                "QR Code",
                "Quick join (coming soon)",
                "Scan to connect",
                [
                    {
                        "type": "note",
                        "heading": "Coming soon",
                        "content": (
                            "A Wi-Fi QR code will appear here once secure house-sitter access is enabled."
                        ),
                    },
                ],
                ["qr", "qr code", "wifi qr"],
            ),
        ],
    }


def local_places_shops() -> list[dict[str, Any]]:
    return [
        _place("Morrisons", "Lakesmere Road, Horndean", "Local supermarket — has everything"),
        _place("Lidl", "1 Waterloo Park, Electra Avenue, Waterlooville", "Cheap and convenient"),
        _place(
            "Sainsbury's",
            "Hambledon Rd, Waterlooville PO7 7UL",
            "Supermarket on Hambledon Road",
        ),
    ]


def local_places_pubs() -> list[dict[str, Any]]:
    return [
        _place(
            "Bat and Ball",
            "Hyde Farm Lane, Hambledon",
            "Fantastic pub with great outside area and food",
            dog_friendly=True,
        ),
        _place(
            "Bird in Hand",
            "269 Lovedean Ln, Waterlooville PO8 9RX",
            "Great food and garden",
            dog_friendly=True,
            website="https://thebirdinhand.net/",
        ),
        _place(
            "Farmer Inn",
            "300 Catherington Ln, Catherington, Waterlooville PO8 0TD",
            "Walking distance — great pub",
            dog_friendly=True,
            website="https://www.farmerportsmouth.co.uk/",
        ),
        _place(
            "The George Inn",
            "Finchdean, Waterlooville PO8 0AU",
            "Lovely setting with walks behind the pub",
            dog_friendly=True,
            website="https://www.georgeinnfinchdean.co.uk/",
        ),
    ]


def local_places_walks() -> list[dict[str, Any]]:
    return [
        _place(
            "Queen Elizabeth Country Park",
            "Gravel Hill, Horndean PO8 0QE",
            "About 10 minutes away — woodland trails and views",
            dog_friendly=True,
        ),
        _place(
            "Staunton Country Park",
            "Stable Cottage, Staunton Country Park, Petersfield Rd, Havant PO9 5HD",
            "Parkland, woodland and lakes — easy walks",
            dog_friendly=True,
        ),
        _place(
            "Butser Hill",
            "Near Queen Elizabeth Country Park",
            "High South Downs viewpoint and walking routes",
            dog_friendly=True,
        ),
    ]


def local_places_attractions() -> list[dict[str, Any]]:
    return [
        _place(
            "Portsmouth Historic Dockyard",
            "Victory Gate, HM Naval Base, Portsea, Portsmouth PO1 3LJ",
            "HMS Victory, Mary Rose, Warrior and navy museum — allow a full day",
            dog_friendly=False,
        ),
        _place(
            "Gunwharf Quays",
            "Gunwharf, Portsmouth PO1 3TZ",
            "Outlet shopping, waterfront dining and Spinnaker Tower views",
            dog_friendly=True,
        ),
        _place(
            "Southsea",
            "Southsea",
            "Seafront walk, castle, shops and Southsea Common",
            dog_friendly=True,
        ),
    ]


def category_local() -> dict[str, Any]:
    return {
        "id": "local",
        "title": "Local Area",
        "cardSubtitle": "Shops • Pubs • Walks",
        "iconId": "map-pin",
        "accent": "#7eab90",
        "searchTerms": ["local", "shop", "pub", "walk", "food"],
        "topics": [
            _topic(
                "local-shops",
                "Shops",
                "Supermarkets nearby",
                "Morrisons, Lidl, Sainsbury's",
                [{"type": "text", "heading": "Shopping", "content": "Nearby supermarkets:"}]
                + local_places_shops(),
                ["shop", "morrisons", "lidl", "sainsbury", "supermarket"],
            ),
            _topic(
                "local-pubs",
                "Dog-friendly Pubs",
                "Food and gardens",
                "Local pubs",
                [{"type": "text", "content": "Dog-friendly pubs nearby:"}] + local_places_pubs(),
                ["pub", "restaurant", "food", "dog friendly pub"],
            ),
            _topic(
                "local-walks",
                "Walks",
                "Country parks and hills",
                "Places to walk Scooter",
                [{"type": "text", "content": "Walks we recommend:"}] + local_places_walks(),
                ["walk", "country park", "qe park", "butser", "staunton"],
            ),
            _topic(
                "local-attractions",
                "Attractions",
                "Days out",
                "Portsmouth and coast",
                [{"type": "text", "content": "Further afield:"}] + local_places_attractions(),
                ["attraction", "dockyard", "gunwharf", "southsea", "spinnaker"],
            ),
            _topic(
                "local-public-transport",
                "Public Transport",
                "Buses and trains",
                "Getting around",
                [
                    {
                        "type": "text",
                        "content": (
                            "Nearest bus stops ~15 minutes' walk — routes 7 and 8 to Waterlooville and Portsmouth. "
                            "Trains from Havant (~15 min drive) and Petersfield (~20 min). "
                            "Car hire available in Portsmouth (Enterprise, Hertz)."
                        ),
                    },
                ],
                ["bus", "train", "transport", "havant", "petersfield"],
            ),
            _topic(
                "local-taxis",
                "Taxis",
                "Uber and local cabs",
                "When you need a ride",
                [
                    {
                        "type": "text",
                        "content": "Uber is widely available. Vezu is a reliable local taxi company.",
                    },
                ],
                ["taxi", "uber", "vezu", "cab"],
            ),
        ],
    }


def category_emergency() -> dict[str, Any]:
    return {
        "id": "emergency",
        "title": "Emergency",
        "cardSubtitle": "Owners • Vet • Utilities",
        "iconId": "siren",
        "accent": "#ff5f6d",
        "searchTerms": ["emergency", "urgent", "999", "help"],
        "topics": [
            _topic(
                "contacting-mark-donna",
                "Contacting Mark and Donna",
                "Questions during your stay",
                "Reach the owners",
                [
                    {
                        "type": "warning",
                        "heading": "Immediate danger",
                        "content": "Call 999 for fire, medical or security emergencies.",
                    },
                    {
                        "type": "text",
                        "content": "For house or Scooter questions, contact us — we'd rather you asked than worried.",
                    },
                    _protected("contact", "Mark — phone", "contacts.mark.phone"),
                    _protected("contact", "Mark — email", "contacts.mark.email"),
                    _protected("contact", "Donna — phone", "contacts.donna.phone"),
                    _protected("contact", "Donna — email", "contacts.donna.email"),
                ],
                ["owners", "mark", "donna", "contact", "phone", "email"],
            ),
            _topic(
                "vet",
                "Vet",
                "Vets 4 Pets Waterlooville",
                "Emergency vet contact",
                [
                    {
                        "type": "contact",
                        "heading": "Vets 4 Pets",
                        "items": [
                            {
                                "label": "Address",
                                "value": "2 Hambledon Road, Waterlooville (inside Pets at Home)",
                            },
                            {"label": "Phone", "value": "023 9225 6510", "href": "tel:02392256510"},
                            {"label": "Opening times", "value": "9am–7pm Mon–Sat; closed Sunday"},
                            {
                                "label": "Emergency / out of hours",
                                "value": "023 9225 6510",
                                "href": "tel:02392256510",
                            },
                        ],
                    },
                ],
                ["vet", "veterinary", "pets at home", "scooter vet"],
            ),
            _topic(
                "water-emergency",
                "Water Emergency",
                "Stop the supply",
                "Leaks and bursts",
                [
                    {
                        "type": "steps",
                        "steps": [
                            "Turn off the main stop tap under the kitchen sink (back of cupboard).",
                            "Contact the owners if you need further help.",
                        ],
                    },
                ],
                ["water leak", "flood", "burst pipe", "stop tap"],
                actions=[{"type": "navigate", "topicId": "water-stop-tap", "label": "Find stop tap"}],
            ),
            _topic(
                "electrical-emergency",
                "Electrical Emergency",
                "Consumer unit",
                "Power issues",
                [
                    {
                        "type": "text",
                        "content": "Consumer unit is on the far wall of the garage — circuits are labelled.",
                    },
                ],
                ["electric", "power cut", "fuse", "trip"],
                actions=[{"type": "navigate", "topicId": "fuse-box", "label": "Fuse box"}],
            ),
            _topic(
                "lock-key-issues",
                "Lock and Key Issues",
                "Spare key lockbox",
                "If you're locked out",
                [
                    {
                        "type": "text",
                        "content": "Spare key is in the lockbox on the left-hand side of the house.",
                    },
                    _protected("lockbox", "Lockbox code", "lockbox.code"),
                ],
                ["locked out", "keys", "lockbox"],
            ),
            _topic(
                "general-safety",
                "General Safety",
                "First aid and mail",
                "Other notes",
                [
                    {
                        "type": "note",
                        "content": "There is no first aid kit on site — use pharmacy or NHS 111 for minor issues.",
                    },
                    {
                        "type": "text",
                        "content": "Please leave mail on the dining room table.",
                    },
                ],
                ["first aid", "mail", "safety", "999"],
            ),
        ],
    }


def build_catalog() -> dict[str, Any]:
    return {
        "version": 2,
        "homeSummaryTitle": "Everything you need to know",
        "homeSummarySubtitle": "Appliances • Wi-Fi • Scooter",
        "media": media_map(),
        "categories": [
            category_arrival(),
            category_scooter(),
            category_kitchen(),
            category_heating_utilities(),
            category_tv(),
            category_bathrooms(),
            category_garden(),
            category_security(),
            category_wifi(),
            category_local(),
            category_emergency(),
        ],
    }


def leaked_secrets(text: str) -> list[str]:
    """Return household values found in ``text``, matched by hash."""

    found: list[str] = []

    candidates = set(WORD_RE.findall(text))
    for match in POSTCODE_RE.finditer(text.upper()):
        candidates.add(match.group(0).replace(" ", ""))
    for token in candidates:
        if hashlib.sha256(token.encode()).hexdigest() in FORBIDDEN_TOKEN_HASHES:
            found.append(token)

    words = [word.lower() for word in WORD_RE.findall(text)]
    for size in range(2, FORBIDDEN_PHRASE_WORDS + 1):
        for start in range(len(words) - size + 1):
            phrase = " ".join(words[start : start + size])
            if hashlib.sha256(phrase.encode()).hexdigest() in FORBIDDEN_PHRASE_HASHES:
                found.append(phrase)

    return found


def validate_catalog(catalog: dict[str, Any]) -> None:
    blob = json.dumps(catalog, ensure_ascii=False)
    if FORBIDDEN_LITERAL in blob:
        raise ValueError(f"Catalog contains forbidden placeholder: {FORBIDDEN_LITERAL!r}")
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, blob, re.IGNORECASE):
            raise ValueError(f"Catalog matches forbidden pattern: {pattern}")
    leaked = leaked_secrets(blob)
    if leaked:
        raise ValueError(f"Catalog contains {len(leaked)} household secret(s)")
    if catalog.get("version") != 2:
        raise ValueError("Catalog version must be 2")
    cats = catalog.get("categories") or []
    if len(cats) != 11:
        raise ValueError(f"Expected 11 categories, got {len(cats)}")
    allowed_buttons = {1, 2, 3, 7, 8}
    for cat in cats:
        for topic in cat.get("topics") or []:
            for action in topic.get("actions") or []:
                if action.get("type") == "alexa":
                    bid = action.get("buttonId")
                    if bid not in allowed_buttons:
                        raise ValueError(f"Invalid alexa buttonId: {bid}")


def count_topics(catalog: dict[str, Any]) -> int:
    return sum(len(c.get("topics") or []) for c in catalog.get("categories") or [])


def main() -> int:
    if not EXTRACTED_TEXT.is_file():
        print(f"Missing source text: {EXTRACTED_TEXT}", file=sys.stderr)
        return 1
    EXTRACTED_TEXT.read_text(encoding="utf-8")

    catalog = build_catalog()
    validate_catalog(catalog)

    CATALOG_OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(catalog, indent=2, ensure_ascii=False) + "\n"
    CATALOG_OUT.write_text(payload, encoding="utf-8")

    topic_count = count_topics(catalog)
    print(f"Wrote {CATALOG_OUT}")
    print(f"Bytes: {CATALOG_OUT.stat().st_size}")
    print(f"Topics: {topic_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
