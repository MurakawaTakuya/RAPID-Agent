from flask import Flask, request, jsonify
import os
import firebase_admin
from firebase_admin import auth

app = Flask(__name__)

# Initialize Firebase Admin SDK
# On Cloud Run, it automatically uses the service account credentials
firebase_admin.initialize_app()

@app.route("/", methods=["POST"])
def echo():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized: No token provided"}), 401

    token = auth_header.split("Bearer ")[1]
    
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        data = request.get_json()
        keyword = data.get("keyword", "") if data else ""
        return jsonify({"message": f"Echo: {keyword}", "uid": uid})
    except Exception as e:
        print(f"Error verifying token: {e}")
        return jsonify({"error": "Unauthorized: Invalid token"}), 401

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
