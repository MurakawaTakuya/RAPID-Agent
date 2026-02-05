from flask import Flask, request, jsonify
import os
import firebase_admin
from firebase_admin import auth
from google import genai
from google.genai import types

app = Flask(__name__)

# Initialize Firebase Admin SDK
# On Cloud Run, it automatically uses the service account credentials
firebase_admin.initialize_app()

# Initialize Genai Client
# On Cloud Run, it uses Application Default Credentials
client = genai.Client(
    vertexai=True,
    project=os.environ.get("GOOGLE_CLOUD_PROJECT", ""),
    location=os.environ.get("VERTEX_AI_LOCATION", "asia-northeast1")
)

MODEL_ID = "gemini-2.5-flash"

@app.route("/", methods=["POST"])
def search():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized: No token provided"}), 401

    token = auth_header.split("Bearer ")[1]
    
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        data = request.get_json()
        keyword = data.get("keyword", "") if data else ""
        
        if not keyword:
            return jsonify({"message": "キーワードを入力してください", "uid": uid})
        
        # Use Google Search grounding + URL context
        tools = [
            types.Tool(google_search=types.GoogleSearch()),
            types.Tool(url_context=types.UrlContext())
        ]
        
        config = types.GenerateContentConfig(
            tools=tools
        )
        
        prompt = f"「{keyword}」について、最新の情報を検索して、日本語で簡潔に説明してください。URLが含まれている場合は、そのページの内容も参照してください。"
        
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=config,
        )
        
        # Extract text from response
        ai_response = response.text
        
        # Get grounding metadata if available
        sources = []
        if hasattr(response.candidates[0], 'grounding_metadata') and response.candidates[0].grounding_metadata:
            metadata = response.candidates[0].grounding_metadata
            if hasattr(metadata, 'grounding_chunks') and metadata.grounding_chunks:
                for chunk in metadata.grounding_chunks:
                    if hasattr(chunk, 'web') and chunk.web:
                        sources.append({
                            "title": chunk.web.title if hasattr(chunk.web, 'title') else "",
                            "uri": chunk.web.uri if hasattr(chunk.web, 'uri') else ""
                        })
        
        # Get URL context metadata if available
        url_sources = []
        if hasattr(response.candidates[0], 'url_context_metadata') and response.candidates[0].url_context_metadata:
            url_metadata = response.candidates[0].url_context_metadata
            if hasattr(url_metadata, 'url_metadata') and url_metadata.url_metadata:
                for url_meta in url_metadata.url_metadata:
                    url_sources.append({
                        "url": url_meta.retrieved_url if hasattr(url_meta, 'retrieved_url') else "",
                        "status": url_meta.url_retrieval_status if hasattr(url_meta, 'url_retrieval_status') else ""
                    })
        
        return jsonify({
            "message": ai_response,
            "keyword": keyword,
            "uid": uid,
            "sources": sources,
            "urlSources": url_sources
        })
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": f"Error: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
