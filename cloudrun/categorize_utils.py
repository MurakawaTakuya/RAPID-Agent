from google import genai
from google.genai import types
from google.genai.types import GenerateContentConfig, EmbedContentConfig
import json
import torch


BATCH_SIZE = 250


def _generate_query_embeddings(
    client: genai.Client, queries: list[str]
) -> list[float]:
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
        queries_embeddings.extend([e.values for e in response.embeddings])
    return queries_embeddings


def _calculate_cosine_similarity(
    vec1: torch.Tensor, vec2: torch.Tensor
) -> float:
    vec1 = vec1 / vec1.norm()
    vec2 = vec2 / vec2.norm()
    similarity = torch.dot(vec1, vec2).item()
    return similarity


def _calculate_similarities_with_query(
    query_embedding: list[float], papers: list[dict]
) -> list[tuple[dict, float]]:
    similarities = []
    for paper in papers:
        sim = _calculate_cosine_similarity(torch.tensor(query_embedding), torch.tensor(paper["embedding"]))
        similarities.append((paper, sim))
    return similarities


def _fetch_similar_papers(
    input_papers: list[dict],
    query_embedding: list[float],
    threshold: float = 0.62,
) -> list[dict]:
    similarities = _calculate_similarities_with_query(
        query_embedding, input_papers
    )
    similar_papers = [
        (paper, sim) for paper, sim in similarities if sim >= threshold
    ]
    similar_papers.sort(key=lambda x: x[1], reverse=True)  # 類似度の高い順にソート
    return [paper for paper, _ in similar_papers]


def generate_categorize_info(
    client: genai.Client, user_input: str
) -> dict:
    """
    Output example:
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
    """

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
    categorize_info = json.loads(json_text)

    for category in categorize_info["categories"]:
        category["content"] = category["content"].replace("\n", " ").strip()

    return categorize_info


def categorize_papers(
    client: genai.Client,
    categorize_info: dict,
    papers: list[dict],
    threshold: float = 0.65
):
    """
    Output:
    {
        "info": {...},  # categorize_infoと同じ形式
        "{category1['title']}": [{paper1}, {paper2}, ...],
        "{category2['title']}": [{paper3}, {paper4}, ...],
        ...
        "other": [{paperX}, {paperY}, ...]  # どのカテゴリにも該当しなかった論文
    }

    複数カテゴリに該当する場合への対応：
    各paper dictには"categories"キーが追加され，分類されたカテゴリのタイトルをリストで持つ．
        e.g. "categories": ["教師あり学習", "ゼロショット学習"]
    "other"には"categories"が空のpaperを割り当てる.
        e.g. "categories": []

    出力例:
    {
        "info": {
            "title": "学習設定",
            "categories": [
                {"title": "教師あり学習", "content": "ラベル付き..."},
                {"title": "弱教師あり学習", "content": "不完全・不..."},
                ...
            ]
        },
        "教師あり学習": [
            {"id": 123, "title": "論文タイトル1", "categories": ["教師あり学習", "ゼロショット学習"], ...},
            paper2,
            ...
        ],
        "弱教師あり学習": [paper3, paper4, ...],
        ...
        "other": [paperX, paperY, ...]
    }
    """

    original_papers = [paper for paper in papers]
    for paper in original_papers:
        paper["categories"] = []  # カテゴリリストを初期化. 再利用時のため.

    queries = [f"{category['title']}: {category['content']}" for category in categorize_info["categories"]]
    query_embeddings = _generate_query_embeddings(client, queries)

    result = {
        "info": categorize_info,
    }
    for q_emb, category in zip(query_embeddings, categorize_info["categories"]):
        category_title = category["title"]
        papers = _fetch_similar_papers(
            original_papers,
            query_embedding=q_emb,
            threshold=threshold,
        )
        for paper in papers:
            paper["categories"].append(category_title)
        result[category_title] = papers

    other_papers = [
        paper for paper in original_papers if len(paper.categories) == 0
    ]
    result["other"] = other_papers

    return result
