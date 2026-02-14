from flask import Flask, request, jsonify
import os

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
from categorize_utils import llm_suggest_categorization, categorize_papers





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
        log_structured("ERROR", "Error connecting to database", error=str(e))
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





def init_genai_client():
    """Initialize GenAI client for Vertex AI (Cloud Run)"""
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION")
    
    if not project or not location:
        message = "GOOGLE_CLOUD_PROJECT or GOOGLE_CLOUD_LOCATION is not set. These are required for Vertex AI initialization."
        log_structured("ERROR", message)
        raise ValueError(message)

    log_structured("INFO", "Initializing Vertex AI Client", project=project, location=location)
    return genai.Client(
        vertexai=True,
        project=project,
        location=location
    )


def generate_query_embedding(
    client: genai.Client, query: str
) -> list[float]:

    # client is passed from caller, do not re-initialize
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

        data = request.get_json(silent=True) or {}
        keyword = data.get("keyword", "") if data else ""
        
        if not keyword or not isinstance(keyword, str) or not keyword.strip():
            log_structured("WARNING", "Invalid keyword provided", keyword=keyword)
            return jsonify({"error": "Invalid keyword: must be a non-empty string"}), 400

        conferences = data.get("conferences", []) if data else []

        if conferences and not isinstance(conferences, list):
            log_structured(
                "WARNING",
                "Invalid conferences provided (must be a list of strings)",
                conferences=conferences,
            )
            return jsonify({"error": "Invalid conferences: must be a list of strings"}), 400

        # Parse conference values (e.g., "cvpr2025") into (name, year) pairs
        conference_filters = []
        for conf in conferences:
            if not isinstance(conf, str):
                 log_structured(
                    "WARNING",
                    "Invalid conference entry (must be a string)",
                    invalid_conference=conf,
                    conferences=conferences,
                )
                 return jsonify({"error": "Invalid conferences: each entry must be a string"}), 400

            # Extract year (trailing digits) and name (everything before)
            match = re.match(r'^(.+?)(\d{4})$', conf)
            if match:
                name_key = match.group(1)  # e.g., "cvpr"
                year = int(match.group(2))  # e.g., 2025
                conference_filters.append((name_key, year))

        # Get threshold from request, default to 0.65
        try:
            similarity_threshold = float(data.get("threshold", 0.65))
            if not (0 <= similarity_threshold <= 1):
                return jsonify({"error": "Invalid threshold: must be between 0 and 1"}), 400
        except (ValueError, TypeError):
            similarity_threshold = 0.65

        # Initialize Client (API Key or Vertex AI)
        client = init_genai_client()
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
                input_embedding_vector = json.dumps(input_embedding)
                
                # Build conference filter clause
                conf_clause = ""
                conf_params: list = []
                if conference_filters:
                    conditions = []
                    for name_key, year in conference_filters:
                        conditions.append(
                            "(LOWER(REPLACE(conference_name, ' ', '')) = %s AND conference_year = %s)"
                        )
                        conf_params.extend([name_key, year])
                    conf_clause = "WHERE " + " OR ".join(conditions)
                
                # Use CTE and inner LIMIT to optimize vector search
                query = f"""
                    WITH query_vec AS (
                        SELECT %s::vector AS q
                    ),
                    filtered_papers AS (
                        SELECT * FROM papers
                        {conf_clause}
                    )
                    SELECT * FROM (
                        SELECT
                            id,
                            title,
                            url,
                            abstract,
                            conference_name,
                            conference_year,
                            1 - (filtered_papers.embedding <=> query_vec.q) AS cosine_similarity
                        FROM filtered_papers, query_vec
                        ORDER BY filtered_papers.embedding <=> query_vec.q ASC
                        LIMIT 500
                    ) sub
                    WHERE cosine_similarity >= %s;
                """
                cur.execute(
                    query,
                    (
                        input_embedding_vector,
                        *conf_params,
                        similarity_threshold,
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
                        f"{len(papers)}件の論文が見つかりました "
                        f"(コサイン類似度 ≥ {similarity_threshold})"
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

def _verify_token(request):
    """Verify Firebase ID token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None, "Unauthorized: No token provided"
    
    token = auth_header.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token['uid'], None
    except Exception as e:
        log_structured("ERROR", "Auth error", error=str(e))
        return None, "Unauthorized: Invalid or expired token"


@app.route("/categorize/suggest", methods=["POST"])
def suggest_categorization():
    uid, error = _verify_token(request)
    if error:
        log_structured("WARNING", "Unauthorized request", error=error)
        return jsonify({"error": error}), 401
    
    data = request.get_json(silent=True) or {}
    user_input = data.get("input", "")
    papers = data.get("papers", [])
    
    if not user_input:
        return jsonify({"error": "Input is required"}), 400

    request_id = str(uuid.uuid4())[:8]
    log_structured("INFO", "Generating categorization suggestions", request_id=request_id, uid=uid, length=len(user_input), papers_count=len(papers))

    try:
        client = init_genai_client()
        suggestions = llm_suggest_categorization(client, user_input, papers)
        return jsonify(suggestions)
    except Exception as e:
        log_structured("ERROR", "Error in suggest_categorization", request_id=request_id, error=str(e))
        return jsonify({"error": "Internal Server Error"}), 500

@app.route("/categorize/run", methods=["POST"])
def run_categorization():
    uid, error = _verify_token(request)
    if error:
        log_structured("WARNING", "Unauthorized request", error=error)
        return jsonify({"error": error}), 401

    data = request.get_json(silent=True) or {}
    categorize_info_data = data.get("info")
    paper_ids = data.get("paper_ids", [])
    
    if not categorize_info_data or not paper_ids:
        return jsonify({"error": "Missing info or paper_ids"}), 400

    request_id = str(uuid.uuid4())[:8]
    log_structured("INFO", "Running categorization", request_id=request_id, uid=uid, papers_count=len(paper_ids))

    conn = None
    try:
        conn = get_db_connection()
        if not conn:
             return jsonify({"error": "Database connection failed"}), 500
             
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Fetch papers with embeddings
            query = "SELECT id, title, url, abstract, conference_name, conference_year, embedding::text as embedding_str FROM papers WHERE id = ANY(%s)"
            cur.execute(query, (paper_ids,))
            rows = cur.fetchall()
            
            papers = []
            for row in rows:
                 # Parse embedding from string
                 try:
                     embedding = json.loads(row["embedding_str"])
                 except (json.JSONDecodeError, TypeError):
                     # Fallback or skip if embedding is invalid
                     log_structured("WARNING", f"Failed to parse embedding for paper {row['id']}", paper_id=row['id'])
                     continue

                 papers.append({
                     "id": row["id"],
                     "title": row["title"],
                     "url": row["url"],
                     "abstract": row["abstract"],
                     "conferenceName": row["conference_name"],
                     "conferenceYear": row["conference_year"],
                     "embedding": embedding
                 })
        
        if not papers:
            return jsonify({"error": "No valid papers found"}), 404

        client = init_genai_client()
        result = categorize_papers(client, categorize_info_data, papers)
        
        # Clean result (remove embeddings)
        cleaned_result = {}
        for key, value in result.items():
            if key == "info":
                cleaned_result[key] = value
                continue
            
            if isinstance(value, list):
                cleaned_result[key] = []
                for p in value:
                     p_copy = p.copy()
                     p_copy.pop("embedding", None)
                     cleaned_result[key].append(p_copy)
            else:
                cleaned_result[key] = value

        return jsonify(cleaned_result)

    except Exception as e:
        log_structured("ERROR", "Error in run_categorization", request_id=request_id, error=str(e))
        return jsonify({"error": "Internal Server Error"}), 500
    finally:
        if conn:
            conn.close()
    port = int(os.environ.get("PORT", 8080))
    log_structured(
        "INFO", 
        "Starting server", 
        port=port
    )
    app.run(host="0.0.0.0", port=port)
