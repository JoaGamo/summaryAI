from flask import Flask, jsonify, request, send_file, Response
from flask_cors import CORS
import os
from dotenv import load_dotenv
import mimetypes
import json
import re

app = Flask(__name__)
CORS(app)

# Configuration
load_dotenv()
REPO_PATH = os.getenv('REPO_PATH')
NOTES_PATH = os.path.join(REPO_PATH, 'notes')

def get_file_structure():
    structure = {}
    for year in os.listdir(NOTES_PATH):
        if not year.startswith('.'):
            year_path = os.path.join(NOTES_PATH, year)
            if os.path.isdir(year_path):
                structure[year] = {}
                for semester in os.listdir(year_path):
                    if not semester.startswith('.'):
                        semester_path = os.path.join(year_path, semester)
                        if os.path.isdir(semester_path):
                            structure[year][semester] = {}
                            for subject in os.listdir(semester_path):
                                if not subject.startswith('.'):
                                    subject_path = os.path.join(semester_path, subject)
                                    if os.path.isdir(subject_path):
                                        structure[year][semester][subject] = []
                                        for root, _, files in os.walk(subject_path):
                                            for file in files:
                                                if file.endswith(('.md', '.pdf', '.png', '.excalidraw.md')):
                                                    rel_path = os.path.relpath(os.path.join(root, file), subject_path)
                                                    structure[year][semester][subject].append(rel_path)
    return structure

@app.route('/api/file-structure')
def file_structure():
    response = jsonify(get_file_structure())
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response 

@app.route('/api/note')
def get_note():
    year = request.args.get('year')
    semester = request.args.get('semester')
    subject = request.args.get('subject')
    file = request.args.get('file')
    
    if not all([year, semester, subject, file]):
        return jsonify({"error": "Missing parameters"}), 400
    
    file_path = os.path.join(NOTES_PATH, year, semester, subject, file)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    
    mime_type, _ = mimetypes.guess_type(file_path)

    if file.endswith('.excalidraw.md'):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        # Extract the JSON part from the markdown file
        json_match = re.search(r'```json\n(.*?)\n```', content, re.DOTALL)
        if json_match:
            json_content = json_match.group(1)
            return Response(json_content, mimetype='application/json')
        else:
            return jsonify({"error": "No JSON content found in Excalidraw file"}), 400
    elif file.endswith('.md'):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return Response(content, mimetype='text/markdown')
    elif mime_type:
        return send_file(file_path, mimetype=mime_type)
    else:
        return jsonify({"error": "Unsupported file type"}), 400 

@app.route('/')
def serve_frontend():
    return send_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_file(path)

if __name__ == '__main__':
    app.run(debug=True)