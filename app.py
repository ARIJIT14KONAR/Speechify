from flask import Flask, request, send_file, render_template, after_this_request
from gtts import gTTS
import os
from uuid import uuid4
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert_to_speech():
    text = request.form['text']
    tts = gTTS(text=text, lang='en')
    file_io = io.BytesIO()
    tts.write_to_fp(file_io)
    file_io.seek(0)

    return send_file(file_io, as_attachment=True, download_name=f"{uuid4()}.mp3", mimetype='audio/mpeg')

if __name__ == '__main__':
    if not os.path.exists("static"):
        os.makedirs("static")
    app.run(debug=False)
