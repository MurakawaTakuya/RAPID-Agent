import argparse
import json
from core_methods import create_vertexai_client, search_papers
from domain.domain import Paper

parser = argparse.ArgumentParser(description="Search research papers by query.")
parser.add_argument("--query", type=str, required=True, help="Search query string.")
parser.add_argument("--input_json", type=str, default="sample/cvpr2025_abst_200sample.json", help="Path to input JSON file containing papers.")
parser.add_argument("--threshold", type=float, default=0.62, help="Similarity threshold for search.")
args = parser.parse_args()


if __name__ == "__main__":
    with open(args.input_json, "r") as f:
        papers_data = json.load(f)
    papers = [Paper.from_json(paper) for paper in papers_data]

    client = create_vertexai_client()
    similar_papers = search_papers(
        client,
        input_papers=papers,
        user_input=args.query,
        threshold=args.threshold,
    )

    print(f"Found {len(similar_papers)} papers similar to the query '{args.query}':\n")
    
    print(f"Results: {len(similar_papers)} papers found.\n")
    for paper in similar_papers:
        print(f"Title: {paper.title}")