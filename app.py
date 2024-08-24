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
    filename = f"{uuid4()}.mp3"
    filepath = os.path.join("static", filename)
    tts.save(filepath)
    
    

    return send_file(filepath, as_attachment=True)

#if __name__ == '__main__':
#    if not os.path.exists("static"):
#        os.makedirs("static")
#    app.run(debug=False)
