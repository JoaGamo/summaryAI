from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
import os
from dotenv import load_dotenv
import mimetypes

app = Flask(__name__)
CORS(app)

# Configuración 
load_dotenv()
REPO_PATH = os.getenv('REPO_PATH')
NOTES_PATH = os.path.join(REPO_PATH, 'notes')

def get_file_structure():
    structure = {}
    for year in os.listdir(NOTES_PATH):
        year_path = os.path.join(NOTES_PATH, year)
        if os.path.isdir(year_path):
            structure[year] = {}
            for semester in os.listdir(year_path):
                semester_path = os.path.join(year_path, semester)
                if os.path.isdir(semester_path):
                    structure[year][semester] = {}
                    for subject in os.listdir(semester_path):
                        subject_path = os.path.join(semester_path, subject)
                        if os.path.isdir(subject_path):
                            structure[year][semester][subject] = [
                                f for f in os.listdir(subject_path)
                                if os.path.isfile(os.path.join(subject_path, f))
                            ]
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
    
    _, file_extension = os.path.splitext(file)
    mime_type, _ = mimetypes.guess_type(file_path)
    
    if file_extension == '.md':
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return Response(content, mimetype='text/markdown')
    elif mime_type:
        return send_from_directory(os.path.dirname(file_path), os.path.basename(file_path), mimetype=mime_type)
    else:
        return jsonify({"error": "Unsupported file type"}), 400

@app.route('/')
def serve_frontend():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(debug=True)