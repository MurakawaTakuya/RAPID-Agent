# https://paper-agent-jhfqsr32ja-an.a.run.app/api/papers

import requests
import json
import tqdm
from domain.domain import Paper

LOCAL_JSON_PATH = "cvpr2025_abstracts_with_categories_RETRIEVAL_DOCUMENT.json"


def post_db(item: Paper) -> list:
    url = "https://paper-agent-jhfqsr32ja-an.a.run.app/api/papers"
    headers = {
        "Content-Type": "application/json",
    }
    payload = {
        "title": item.title,
        "abstract": item.abstract,
        "url": item.url,
        "conference_name": item.conference_name,
        "conference_year": item.conference_year,
        "embedding": item.embedding,
        "authors": item.authors,
    }

    response = requests.post(url, headers=headers, data=json.dumps(payload))
    response.raise_for_status()  # Raise an error for bad status code

    return response.json()

if  __name__ == "__main__":
    with open(LOCAL_JSON_PATH, 'r') as f:
        data = json.load(f)

    for sample in tqdm.tqdm(data):
        sample["conference_name"] = "CVPR"
        sample["conference_year"] = 2025
        result = post_db(Paper.from_json(sample))
