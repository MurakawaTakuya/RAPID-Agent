import argparse
import json
from core_methods import create_vertexai_client, generate_category_theme, categorize_papers
from domain.domain import Paper

parser = argparse.ArgumentParser(description="Categorize research papers by query.")
parser.add_argument("--query", type=str, required=True, help="Categorize query string.")
parser.add_argument("--input_json", type=str, default="sample/cvpr2025_abst_200sample.json", help="Path to input JSON file containing papers.")
parser.add_argument("--threshold", type=float, default=0.62, help="Similarity threshold for search.")
args = parser.parse_args()


if __name__ == "__main__":
    with open(args.input_json, "r") as f:
        papers_data = json.load(f)
    papers = [Paper.from_json(paper) for paper in papers_data]

    client = create_vertexai_client()
    query_theme = generate_category_theme(client, user_input=args.query)

    print("Category Theme:")
    print(query_theme)

    print("\nCategorizing papers...")
    result = categorize_papers(
        client,
        query_theme,
        papers,
        threshold=args.threshold,
    )
    for category_title, categorized_papers in result.items():
        if category_title == "theme":
            continue
        print(f"\nCategory: {category_title} - {len(categorized_papers)} papers")
        for paper in categorized_papers[:5]:
            print(f"  - {paper.title}")
        print("  ...")