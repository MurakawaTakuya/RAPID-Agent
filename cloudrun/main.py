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

# System instruction for JSON-only output
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
def generate_embeddings(client, texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts using Gemini embedding model
    
    Handles batching automatically if more than 250 texts are provided.
    """
    if not texts:
        return []
    
    BATCH_SIZE = 250
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



@app.route("/", methods=["POST"])
def search():
    # Initialize Genai Client
    client = genai.Client(
        vertexai=True,
        project=os.environ.get("GOOGLE_CLOUD_PROJECT", ""),
        location=os.environ.get("VERTEX_AI_LOCATION", "asia-northeast1")
    )
    model_id = "gemini-2.5-flash"
    
    request_id, uid, keyword = None, None, None
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        log_structured(
            "WARNING", 
            "Unauthorized request", 
            error="No token provided"
        )
        return jsonify({"error": "Unauthorized: No token provided"}), 401

    token = auth_header.split("Bearer ")[1]
    
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        data = request.get_json()
        keyword = data.get("keyword", "") if data else ""
        
        if not keyword:
            log_structured("INFO", "Empty keyword received", uid=uid)
            return jsonify({
                "papers": [],
                "keyword": "",
                "uid": uid,
                "message": "キーワードを入力してください"
            })
        
        # Use Google Search grounding + URL context
        tools = [
            types.Tool(google_search=types.GoogleSearch()),
            types.Tool(url_context=types.UrlContext())
        ]
        
        config = types.GenerateContentConfig(
            tools=tools,
            system_instruction=SEARCH_SYSTEM_INSTRUCTION,
            # Note: response_mime_type cannot be used with URL Context tool
        )
        
        # Generate request ID for log correlation
        request_id = str(uuid.uuid4())[:8]
        
        # Log the request
        log_structured(
            "INFO", 
            f"Generating content: {request_id}", 
            uid=uid, 
            keyword=keyword,
            model=model_id
        )
        
        response = client.models.generate_content(
            model=model_id,
            contents=keyword,
            config=config,
        )
        
        # Extract text from response
        ai_response = response.text
        
        # Parse JSON response
        parsed_response = extract_json_from_response(ai_response)
        
        if not parsed_response or "papers" not in parsed_response:
            log_structured(
                "WARNING",
                f"Failed to parse LLM response: {request_id}",
                raw_response=ai_response[:500]
            )
            return jsonify({
                "error": "論文リストの取得に失敗しました",
                "raw_response": ai_response
            }), 500
        
        papers = parsed_response.get("papers", [])
        
        # Generate embeddings for paper titles
        if papers:
            titles = [paper.get("title", "") for paper in papers]
            embeddings = generate_embeddings(client, titles)
            
            # Add embeddings to papers
            for i, paper in enumerate(papers):
                if i < len(embeddings):
                    paper["embedding"] = embeddings[i]
        
        # Log successful response
        log_structured(
            "INFO",
            f"Content generated successfully: {request_id}",
            request_id=request_id,
            uid=uid,
            keyword=keyword,
            papers_count=len(papers)
        )
        
        return jsonify({
            "papers": papers,
            "keyword": keyword,
            "uid": uid,
        })
    except Exception as e:
        # Log error
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
