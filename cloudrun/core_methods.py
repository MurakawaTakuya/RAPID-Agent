import os
import json
from typing import Optional
from google import genai
from google.genai.types import EmbedContentConfig
from google.genai.types import GenerateContentConfig
from google.genai import types

from domain.domain import Paper, Category, CategoryTheme, PaperWithCategories

import torch


# 環境変数の準備
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "./key/paper-agent-486306-5f393d996a84.json"

# プロジェクト ID / リージョン をここに書き換えてください
PROJECT_ID = "paper-agent-486306"
LOCATION = "global"

# Vertex AI 用の環境変数も設定
os.environ["GOOGLE_CLOUD_PROJECT"] = PROJECT_ID
os.environ["GOOGLE_CLOUD_LOCATION"] = LOCATION
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

BATCH_SIZE = 200


def create_vertexai_client() -> genai.Client:
    client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)
    return client


def generate_category_theme(
    client: genai.Client, user_input: str
) -> CategoryTheme:
    prompt = """
    コンピュータビジョン分野の論文のカテゴリ分けの準備をします．
    [ユーザー入力]に適した[分類軸テーマ]とそれに準ずる[カテゴリ]集合を以下の例に従って出力してください．
    注意点："content"は簡潔に,検索に使われるキーワードやフレーズを中心に記述してください．
    
    [例]
    [ユーザー入力]: 学習設定に関する分類．教師ありとか．
    出力：
    {
        "title": "学習設定",
        "categories": [
            {"title": "教師あり学習", "content": "ラベル付きデータを用いてモデルを学習"},
            {"title": "弱教師あり学習", "content": "不完全・不正確・曖昧なラベルを用いて学習"},
            {"title": "自己教師あり学習", "content": "ラベルなしデータから特徴を学習"},
            {"title": "少数ショット学習", "content": "少数の例から新しいタスクを学習"},
            {"title": "ゼロショット学習", "content": "事前学習のみで新しいタスクを遂行"},
            {"title": "継続学習", "content": "新しいタスクを学習しながら既存の知識を保持"},
            {"title": "マルチモーダル学習", "content": "複数のデータモダリティを統合して学習"}
        ]
    }

    [ユーザー入力]： Video Diffusionで動作生成する系
    出力：
    {
        "title": "Video Diffusionによる動作生成",
        "categories": [
            {"title": "Text to Video", "content": "単純なテキストプロンプトから動画を生成する手法"},
            {"title": "Motion customization", "content": "参照となる動画から動作情報を抽出して学習"},
            {"title": "Motion transfer", "content": "ある動画の動作を別のコンテンツに適用して生成"},
            {"title": "Video editing", "content": "既存の動画を編集・変換して新しい動画を生成"},
    }
    """
    prompt += f'\n[ユーザー入力]： {user_input}\n出力：\n'

    tools = [
        types.Tool(google_search=types.GoogleSearch()),
        types.Tool(url_context=types.UrlContext())
    ]

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=GenerateContentConfig(
            response_modalities=["TEXT"],
            tools=tools,
        ),
    )
    text = response.text
    start_idx = text.find("{")
    end_idx = text.rfind("}") + 1
    json_text = text[start_idx:end_idx]
    category_info = json.loads(json_text)

    categories = []
    for category in category_info["categories"]:
        category["content"] = category["content"].replace("\n", " ").strip()
        categories.append(Category(**category))
    category_theme = CategoryTheme(
        title=category_info["title"], categories=categories
    )
    return category_theme


def generate_query_embeddings(
    client: genai.Client, queries: list[str]
) -> torch.Tensor:
    queries_embeddings = []
    for i in range(0, len(queries), BATCH_SIZE):
        if i + BATCH_SIZE > len(queries):
            batch = queries[i:]
        else:
            batch = queries[i: i + BATCH_SIZE]

        client = genai.Client()
        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=batch,
            config=EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=768,
            ),
        )
        queries_embeddings.extend([torch.tensor(e.values) for e in response.embeddings])
    return queries_embeddings


def calculate_cosine_similarity(
    vec1: torch.Tensor, vec2: torch.Tensor
) -> float:
    vec1 = vec1 / vec1.norm()
    vec2 = vec2 / vec2.norm()
    similarity = torch.dot(vec1, vec2).item()
    return similarity


def calculate_similarities_with_query(
    query_embedding: torch.Tensor, papers: list[Paper]
) -> list[tuple[Paper, float]]:
    similarities = []
    for paper in papers:
        sim = calculate_cosine_similarity(query_embedding, paper.embedding)
        similarities.append((paper, sim))
    return similarities


def search_papers(
    client: genai.Client,
    input_papers: list[Paper],
    user_input: Optional[str] = None,
    threshold: float = 0.65,
    query_embedding: Optional[torch.Tensor] = None,
) -> list[Paper]:
    if query_embedding is None:
        assert user_input is not None, "Either user_input or query_embedding must be provided."
        query_embedding = generate_query_embeddings(client, [user_input])[0]

    similarities = calculate_similarities_with_query(
        query_embedding, input_papers
    )
    similar_papers = [
        (paper, sim) for paper, sim in similarities if sim >= threshold
    ]
    similar_papers.sort(key=lambda x: x[1], reverse=True)  # 類似度の高い順にソート
    return [paper for paper, _ in similar_papers]


def categorize_papers(
    client: genai.Client,
    category_theme: CategoryTheme,
    papers: list[Paper],
    query_embeddings: Optional[list[torch.Tensor]] = None,
    threshold: float = 0.65
):
    """
    returns: {
        "theme": CategoryTheme,
        "<category_title_1>": list[PaperWithCategories],
        "<category_title_2>": list[PaperWithCategories],
        ...
        "other": list[PaperWithCategories],
    }
    """

    original_papers = [PaperWithCategories(**paper.__dict__) for paper in papers]

    for paper in original_papers:
        paper.categories = []  # カテゴリリストを初期化. 再利用時のため.

    if query_embeddings is None:
        queries = [category.to_query_string() for category in category_theme.categories]
        query_embeddings = generate_query_embeddings(client, queries)

    result = {
        "theme": category_theme,
    }
    for q_emb, category in zip(query_embeddings, category_theme.categories):
        papers = search_papers(client, original_papers, query_embedding=q_emb, threshold=threshold)
        for paper in papers:
            paper.categories.append(category)
        result[category.title] = papers
    
    other_papers = [
        paper for paper in original_papers if len(paper.categories) == 0
    ]
    result["other"] = other_papers

    return result
