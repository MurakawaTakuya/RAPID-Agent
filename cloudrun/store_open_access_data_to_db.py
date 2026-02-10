import json
import tqdm
import argparse

import torch
from google import genai
from google.genai.types import EmbedContentConfig

from core_methods import create_vertexai_client
from post_db.openaccess_croller import collect_papers_to_json
from post_db.post_db import post_db
from domain.domain import Paper

parser = argparse.ArgumentParser()
parser.add_argument("--conf", type=str, default="ICCV", help="Conference name")
parser.add_argument("--year", type=int, default=2025, help="Conference year")
args = parser.parse_args()


BATCH_SIZE = 200


def generate_document_embeddings(
    client: genai.Client, documents: list[str]
) -> list[torch.Tensor]:
    document_embeddings = []
    for i in tqdm.tqdm(range(0, len(documents), BATCH_SIZE)):
        if i + BATCH_SIZE > len(documents):
            batch = documents[i:]
        else:
            batch = documents[i: i + BATCH_SIZE]

        client = genai.Client()
        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=batch,
            config=EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=768,
            ),
        )
        document_embeddings.extend([e.values for e in response.embeddings])
    return document_embeddings


def post_db_task(conference: str, year: int):
    print("Collected ")
    papers = collect_papers_to_json(
        conference, year,
        max_abstract_count=None,
    )
    print(f"Collected {len(papers)} papers.")
    print("Generating embeddings...")

    client = create_vertexai_client()

    texts = [f"Title: {item['title']}\nAbstract: {item['abstract']}\nConference: {conference} {year}" for item in papers]
    embeddings = generate_document_embeddings(client, texts)

    for i in range(len(papers)):
        papers[i]["conference_name"] = conference
        papers[i]["conference_year"] = year
        papers[i]["embedding"] = embeddings[i]

    embeddings_output_path = f"./post_db/{conference}{year}_abstracts.json"
    with open(embeddings_output_path, "w", encoding="utf-8") as f:
        json.dump(papers, f, ensure_ascii=False, indent=2)

    for sample in tqdm.tqdm(papers):
        post_db(Paper.from_json(sample))


if __name__ == "__main__":

    CONFERENCE = args.conference
    YEAR = args.year
    post_db_task(CONFERENCE, YEAR)
