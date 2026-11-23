"""Attach named mancomunidad website references from a saved official REELL CSV.

Retains names, registry codes and validated public websites only. Other CSV
fields, including personal contact fields, are never included in the output.
"""
import argparse
import csv
import hashlib
import ipaddress
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

SOURCE = 'https://datosabiertos.navarra.es/dataset/entidades-locales-de-navarra'


def words(value):
    plain = ''.join(c for c in unicodedata.normalize('NFKD', value.lower()) if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', ' ', plain).strip()


def public_website(value):
    if not value.strip():
        return None
    url = urlsplit(value.strip() if '://' in value else 'https://' + value.strip())
    host = url.hostname or ''
    if url.scheme not in ('http', 'https') or url.username or url.password or url.port or not re.fullmatch(r'(?:[a-z0-9-]+\.)+[a-z]{2,63}', host):
        raise ValueError('Directory website requires public HTTPS identity review')
    if host.endswith(('.local', '.internal', '.localhost', '.test', '.invalid', '.onion')):
        raise ValueError('Non-public directory website')
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError('IP address is not an institutional website')
    return urlunsplit(('https', host, url.path or '/', url.query, ''))


def synchronize(inventory, rows, evidence):
    directory = [r for r in rows if r['Tipo entidad (ES)'] == 'Mancomunidad']
    if len(directory) != 61 or len(inventory) != 213:
        raise ValueError('Expected full official directory and institution inventory; nothing written')
    results = []
    for entity in inventory:
        if entity['territory'] != 'Navarra' or not entity['name'].startswith('Mancomunidad'):
            continue
        expected = words(entity['name'])
        hits = [r for r in directory if words(r['Denominación (ES)']) == expected or words(r['Denominación (ES)']).startswith(expected + ' ')]
        if len(hits) != 1:
            raise ValueError('Missing or ambiguous mancomunidad identity: ' + entity['name'])
        row = hits[0]
        website = public_website(row['Web'])
        if website:
            entity.update(websiteFromDirectory=website, websiteDirectoryUrl=SOURCE, websiteDirectoryName=row['Denominación (ES)'].strip(), websiteDirectoryStatus='verified', websiteDirectoryCheckedAt=evidence['reviewedAt'], websiteDirectoryEvidence=evidence, officialRegistryCode=row['Código REELL Navarra'])
        results.append({'id': entity['id'], 'name': entity['name'], 'publishedName': row['Denominación (ES)'].strip(), 'url': website, 'status': 'website-verified' if website else 'website-unpublished'})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    path = root / 'docs/inventory/institutions.json'
    original = path.read_text()
    inventory = json.loads(original)
    raw = args.csv.read_bytes()
    evidence = {'mode': 'saved-official-dataset', 'retrievedAt': datetime.fromtimestamp(args.csv.stat().st_mtime, timezone.utc).isoformat(), 'reviewedAt': datetime.now(timezone.utc).isoformat(), 'sha256': hashlib.sha256(raw).hexdigest(), 'sourceUrl': SOURCE}
    with args.csv.open(encoding='utf-8-sig', newline='') as source:
        results = synchronize(inventory, list(csv.DictReader(source)), evidence)
    if path.read_text() != original:
        raise ValueError('Concurrent inventory edits preserved; no changes written')
    report = {'evidence': evidence, 'note': 'Named website references from a saved official dataset; no fresh live fetch or employment coverage is implied.', 'results': results}
    report_path = root / 'docs/inventory/navarra-mancomunidad-websites.json'
    temporary_report = report_path.with_suffix('.json.tmp')
    temporary_report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    temporary_report.replace(report_path)
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)
    print(json.dumps({'matched': len(results), 'verified': sum(r['status'] == 'website-verified' for r in results)}))


if __name__ == '__main__':
    main()
