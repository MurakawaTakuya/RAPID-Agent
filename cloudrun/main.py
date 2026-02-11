from flask import Flask, request, jsonify
import os
import logging
import json
import uuid
import re
import firebase_admin
from firebase_admin import auth
from google import genai
from google.genai import types
from google.genai.types import EmbedContentConfig
import psycopg2
from psycopg2.extras import RealDictCursor


# Configure logging for Cloud Run
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)

def log_structured(severity: str, message: str, **kwargs):
    """Log in structured format for Cloud Logging"""
    log_entry = {
        "severity": severity,
        "message": message,
        **kwargs
    }
    print(json.dumps(log_entry, ensure_ascii=False), flush=True)

app = Flask(__name__)

# Initialize Firebase Admin SDK
# On Cloud Run, it automatically uses the service account credentials
firebase_admin.initialize_app()


def get_db_connection():
    """Create a database connection"""
    try:
        conn = psycopg2.connect(os.environ.get("DATABASE_URL"))
        return conn
    except Exception as e:
        logger.error(f"Error connecting to database: {e}")
        return None
SEARCH_SYSTEM_INSTRUCTION = """
あなたは論文検索アシスタントです。ユーザーのキーワードについて最新情報を検索し、関連する論文をリストアップしてください。

【重要な指示】
- 必ずJSON形式のみで出力してください
- JSON以外のテキスト（説明文、挨拶、マークダウン記号など）は一切出力しないでください
- コードブロック記号（```json や ```）も使用しないでください

【出力フォーマット】
以下の形式で出力してください:
{"papers": [{"title": "論文タイトル", "url": "論文ページへのURL"}, ...]}

【論文ページのURLについて】
- 論文の個別ページ（タイトルやabstractが表示されるページ）へのリンクを使用してください
- 例: arXiv, IEEE, ACM, Google Scholar などの論文詳細ページ
"""


def extract_json_from_response(text: str) -> dict | None:
    """Extract JSON from LLM response, handling potential markdown formatting"""
    # Remove markdown code blocks if present
    text = re.sub(r'^```json?\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'```\s*$', '', text, flags=re.MULTILINE)
    text = text.strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                return None
    return None


# TDDO: 一度にembeddingできるのは最大で250個までの可能性あり
BATCH_SIZE = 250
def generate_embeddings(client, texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts using Gemini embedding model
    
    Handles batching automatically if more than 250 texts are provided.
    """
    if not texts:
        return []
    
    all_embeddings = []
    
    # Process in batches of 250
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        result = client.models.embed_content(
            model="gemini-embedding-001",
            contents=batch,
            config={
                "output_dimensionality": 768,  # Match DB schema (768 dimensions)
                "task_type": "CLUSTERING",  # Optimized for similarity-based grouping
            },
        )
        all_embeddings.extend([e.values for e in result.embeddings])
    
    return all_embeddings


def generate_query_embedding(
    client: genai.Client, query: str
) -> list[list[float]]:

    client = genai.Client()
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=[query],
        config=EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=768,
        ),
    )
    return response.embeddings[0].values


@app.route("/", methods=["POST"])
def search():
    request_id = None
    uid = None
    keyword = ""

    # Auth check
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        log_structured("WARNING", "Unauthorized request", error="No token provided")
        return jsonify({"error": "Unauthorized: No token provided"}), 401

    token = auth_header.split("Bearer ")[1]

    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']

        data = request.get_json()
        keyword = data.get("keyword", "") if data else ""
        conferences = data.get("conferences", []) if data else []
        # input_embedding = data.get("input_embedding", []) if data else []
        similarity_threshold = 0.62

        # TODO: initialize Client beforehand
        client = genai.Client()
        input_embedding = generate_query_embedding(client, keyword)

        # Log the request
        request_id = str(uuid.uuid4())[:8]
        log_structured(
            "INFO", 
            f"Processing request: {request_id}", 
            uid=uid, 
            keyword=keyword,
            conferences=conferences
        )
        
        # Connect to DB
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                input_embedding_vector = "[" + ",".join(map(str, input_embedding)) + "]"
                query = """
                    SELECT
                        id,
                        title,
                        url,
                        abstract,
                        conference_name,
                        conference_year,
                        embedding,
                        1 - (embedding <=> %s::vector) AS cosine_similarity
                    FROM papers
                    WHERE 1 - (embedding <=> %s::vector) >= %s
                    ORDER BY embedding <=> %s::vector ASC
                    LIMIT %s;
                """
                cur.execute(
                    query,
                    (
                        input_embedding_vector,
                        input_embedding_vector,
                        similarity_threshold,
                        input_embedding_vector,
                        50,  # Limit to top 50 results
                    ),
                )
                rows = cur.fetchall()
                
                # Convert to camelCase for frontend compatibility
                papers = []
                for row in rows:
                    papers.append({
                        "id": row["id"],
                        "title": row["title"],
                        "url": row["url"],
                        "abstract": row["abstract"],
                        "conferenceName": row["conference_name"],
                        "conferenceYear": row["conference_year"],
                        "cosineSimilarity": float(row["cosine_similarity"]),
                        "embedding": row["embedding"],
                    })
                
                log_structured(
                    "INFO",
                    f"Fetched {len(papers)} papers",
                    request_id=request_id,
                    count=len(papers)
                )
                
                return jsonify({
                    "conferences": conferences,
                    "keyword": keyword,
                    "papers": papers,
                    "count": len(papers),
                    "threshold": similarity_threshold,
                    "message": (
                        f"Found {len(papers)} papers "
                        f"(cosine similarity >= {similarity_threshold})"
                    ),
                })
                
        finally:
            conn.close()

    except Exception as e:
        log_structured(
            "ERROR", 
            f"Error processing request: {request_id or 'N/A'}",
            request_id=request_id,
            error=str(e),
            keyword=keyword,
            uid=uid
        )
        return jsonify({"error": f"Error: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    log_structured(
        "INFO", 
        "Starting server", 
        port=port
    )
    app.run(host="0.0.0.0", port=port)
