pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

document.getElementById('pdf-upload').addEventListener('change', function(event) {
    const fileName = event.target.files[0] ? event.target.files[0].name : 'No file selected';
    document.getElementById('file-name').textContent = fileName;
    
});

document.getElementById('convert-btn').addEventListener('click', () => {
    const file = document.getElementById('pdf-upload').files[0];
    if (file) {
        document.getElementById('info').style.display = 'none';       
        document.getElementById('container').style.width = '80%';
        console.log("PDF file selected:", file.name);

        // Show the spinner and reset the progress bar
        document.getElementById('spinner').style.display = 'block';
        document.getElementById('download-link').style.display = 'none';
        document.getElementById('progress-container').style.display = 'block';
        updateProgress(0);

        const fileReader = new FileReader();
        fileReader.onload = function () {
            const typedarray = new Uint8Array(this.result);
            updateProgress(10); // Progress after file is loaded

            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                console.log("PDF loaded, number of pages:", pdf.numPages);
                const numPages = pdf.numPages;
                document.getElementById('total-pages').innerText = `Total Pages: ${numPages}`;
                document.getElementById('total-pages').style.display = 'block';
                let pagesProcessed = 0;
                let textContent = ""; // Variable to store extracted text

                const pdfContentDiv = document.getElementById('pdf-content');
                pdfContentDiv.innerHTML = ''; // Clear previous content
                pdfContentDiv.style.display = 'block'; // Show the div content-div

                const pagesPromises = [];
                for (let i = 1; i <= numPages; i++) {
                    document.getElementById('status').innerText = "STATUS: Loading PDF.....";
                    pagesPromises.push(
                        renderPage(pdf, i).then(() => {
                            return extractPageText(pdf, i).then(pageText => {
                                textContent += pageText + " "; // Append extracted text
                                pagesProcessed++;
                                updateProgress(10 + (30 * pagesProcessed / numPages)); // Progress during rendering
                            });
                        })
                    );
                }

                Promise.all(pagesPromises).then(() => {
                    console.log("PDF rendered and text extracted completely");
                    updateProgress(50); // Progress after rendering completion

                    // Convert the extracted text to speech
                    convertTextToSpeech(textContent);

                    document.getElementById('spinner').style.display = 'none';
                    document.getElementById('status').innerText = "STATUS: PDF loaded successfully.";
                }).catch(error => {
                    console.error('Error rendering or extracting text from PDF:', error);
                    document.getElementById('status').innerText = "Error rendering or extracting text from PDF.";
                    document.getElementById('spinner').style.display = 'none';
                    updateProgress(0); // Reset on error
                });
            }).catch(error => {
                console.error('Error loading PDF:', error);
                document.getElementById('status').innerText = "Error loading PDF.";
                document.getElementById('spinner').style.display = 'none';
                updateProgress(0); // Reset on error
            });
        };
        fileReader.readAsArrayBuffer(file);
    } else {
        alert("Please upload a PDF file first.");
    }
});

function renderPage(pdf, pageNum) {
    return pdf.getPage(pageNum).then(page => {
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        return page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
            const pdfPageDiv = document.createElement('div');
            pdfPageDiv.className = 'pdf-page';
            pdfPageDiv.appendChild(canvas);
            document.getElementById('pdf-content').appendChild(pdfPageDiv);
        });
    });
}

function extractPageText(pdf, pageNum) {
    return pdf.getPage(pageNum).then(page => {
        return page.getTextContent().then(textContent => {
            let text = "";
            textContent.items.forEach(item => {
                text += item.str + " ";
            });
            return text;
        });
    });
}

function convertTextToSpeech(textContent) {
    // Ensure text is not too long
    const MAX_TEXT_LENGTH = 10000; // Define your max length
    if (textContent.length > MAX_TEXT_LENGTH) {
        textContent = textContent.substring(0, MAX_TEXT_LENGTH);
        console.warn("Text truncated to fit service limitations.");
    }

    fetch('/convert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'text': textContent
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.getElementById('download-link');
        downloadLink.href = url;
        downloadLink.style.display = 'block';
        downloadLink.download = 'speech.mp3';
        downloadLink.innerText = 'Download MP3';
        updateProgress(100); // Progress after conversion completion
        document.getElementById('progress-container').style.display = 'none';
        document.getElementById('status').innerText = "STATUS: Conversion complete.";
        
        //calculate and display the duration of the audio
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', function() {
            const duration = audio.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            if(minutes>59){
                const hours = Math.floor(minutes/60);
                const minutes = Math.floor(minutes%60);
                document.getElementById('audio-duration').innerText = hours + "hours" + minutes + " minutes " + seconds + " seconds ";
            }
            else{ document.getElementById('audio-duration').innerText = minutes + " minutes " + seconds + " seconds ";
            }
           
            document.getElementById('audio-duration').style.display = 'block';
        });
    })
    .catch(error => {
        console.error('Error converting text to speech:', error);
        document.getElementById('status').innerText = "Error converting text to speech.";

        // Hide the spinner
        document.getElementById('spinner').style.display = 'none';
        updateProgress(0); // Reset on error
    });
}

function updateProgress(percentage) {
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = percentage + '%';
    progressBar.innerText = Math.floor(percentage) + '%'; // Round down to nearest integer for cleaner UI
    console.log("Progress: " + percentage + "%");
}
