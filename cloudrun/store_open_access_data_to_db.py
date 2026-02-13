import json
import tqdm
import argparse

from google import genai
from google.genai.types import EmbedContentConfig

from core_methods import create_vertexai_client
from post_db.openaccess_croller import collect_papers_to_json
from post_db.post_db import post_db
from domain.domain import Paper

parser = argparse.ArgumentParser()
parser.add_argument("--conf", type=str, default="ICCV", help="Conference name")
parser.add_argument("--year", type=int, default=2025, help="Conference year")
parser.add_argument("--json_path", type=str, default=None, help="Path to local json file")
args = parser.parse_args()


BATCH_SIZE = 200


def generate_document_embeddings(
    client: genai.Client, documents: list[str]
) -> list[float]:
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
        # print(document_embeddings)
        print(f"type of embedding: {type(document_embeddings[0])}")
    return document_embeddings


def post_db_task(conference: str, year: int, json_path: str = None, max_abstract_count: int = None):
    if json_path is None:
        print("Collected ")
        papers = collect_papers_to_json(
            conference, year,
            max_abstract_count=max_abstract_count,
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
    else:
        with open(json_path, 'r') as f:
            papers = json.load(f)

    for i, sample in enumerate(tqdm.tqdm(papers)):
        res = post_db(Paper.from_json(sample))
        if i % 50 == 0:
            print(res)


if __name__ == "__main__":

    CONFERENCE = args.conf
    YEAR = args.year
    JSON_PATH = args.json_path
    post_db_task(CONFERENCE, YEAR, JSON_PATH)
