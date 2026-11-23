"""Attach official website references from a downloaded Navarra municipality CSV.

Only municipality names, registry codes and websites are retained. The source
also contains personal contact information, which is deliberately not copied.
"""
import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

SOURCE = "https://datosabiertos.navarra.es/dataset/entidades-locales-de-navarra"


def synchronize(inventory, rows):
    municipalities = [row for row in rows if row["Tipo entidad (ES)"].startswith("Municipio")]
    existing = {row.get("officialCode"): row for row in inventory if row["territory"] == "Navarra"}
    if len(municipalities) != 272 or len(existing) != 272:
        raise ValueError("Expected 272 Navarra municipalities; reconcile the directory manually")
    updates = {}
    checked_at = datetime.now(timezone.utc).isoformat()
    for row in municipalities:
        registry_code = row["Código REELL Navarra"]
        if not registry_code.isdigit() or int(registry_code) % 10000:
            raise ValueError("Unexpected municipality registry code")
        code = "31" + str(int(registry_code) // 10000).zfill(3)
        if code not in existing or code in updates:
            raise ValueError("Unknown or duplicate municipality code")
        previous = existing[code]
        published_name = row["Denominación (ES)"].strip()
        if not published_name:
            raise ValueError("Missing municipality name")
        updates[previous["id"]] = {
            **previous,
            "aliases": sorted(set(previous.get("aliases", []) + [published_name])),
            "websiteFromDirectory": row["Web"].strip() or None,
            "websiteDirectoryUrl": SOURCE,
            "websiteDirectoryCheckedAt": checked_at,
        }
    if len(updates) != len(existing):
        raise ValueError("Incomplete directory; inventory has not been changed")
    return [updates.get(item["id"], item) for item in inventory]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path)
    args = parser.parse_args()
    destination = Path(__file__).resolve().parent.parent / "docs/inventory/municipalities.json"
    with args.csv.open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source))
    result = synchronize(json.loads(destination.read_text()), rows)
    temporary = destination.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(destination)
    print(json.dumps({"verified": 272, "withWebsite": sum(bool(row.get("websiteFromDirectory")) for row in result if row["territory"] == "Navarra")}))


if __name__ == "__main__":
    main()
