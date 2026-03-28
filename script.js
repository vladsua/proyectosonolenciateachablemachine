const URL = "https://teachablemachine.withgoogle.com/models/MKvE_ibdU/";

let model, webcam, labelContainer, maxPredictions;
let isDetecting = false;
let currentState = "none";
let awakeTimer = null;

const audioSomnoliento = document.getElementById("audio-somnoliento");
const audioDespierto = document.getElementById("audio-despierto");
const messageContainer = document.getElementById("message-container");
const overlay = document.getElementById("status-overlay");
const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");

// Configuración de audio para evitar bloqueos del navegador
audioSomnoliento.volume = 0.8;
audioDespierto.volume = 0.6;

btnStart.addEventListener("click", init);
btnStop.addEventListener("click", stopDetection);

async function init() {
    btnStart.disabled = true;
    overlay.innerHTML = "INICIANDO CÁMARA...";
    overlay.style.display = "flex";

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Configurar la webcam
        const flip = true; 
        webcam = new tmImage.Webcam(400, 400, flip);
        await webcam.setup(); // request access to the webcam
        await webcam.play();
        isDetecting = true;
        
        window.requestAnimationFrame(loop);

        document.getElementById("webcam-container").innerHTML = "";
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        
        overlay.style.display = "none";
        
        btnStop.disabled = false;

        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = "";
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }

        // Request audio interactions
        audioSomnoliento.load();
        audioDespierto.load();

    } catch (err) {
        console.error("Error al iniciar:", err);
        overlay.innerHTML = "ERROR AL ACCEDER A LA CÁMARA";
        btnStart.disabled = false;
    }
}

async function loop() {
    if (!isDetecting) return;
    webcam.update(); 
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    let highestProb = 0;
    let bestClass = "";

    for (let i = 0; i < maxPredictions; i++) {
        const probabilidad = (prediction[i].probability * 100).toFixed(0);
        const texto = prediction[i].className + ": " + probabilidad + "%";
        labelContainer.childNodes[i].innerHTML = texto;
        
        if (prediction[i].probability > highestProb) {
            highestProb = prediction[i].probability;
            bestClass = prediction[i].className;
        }
    }

    if (highestProb > 0.80) {
        handleState(bestClass);
    }
}

function handleState(detectedClass) {
    if (detectedClass.toLowerCase() === "somnoliento" && currentState !== "somnoliento") {
        currentState = "somnoliento";
        clearTimeout(awakeTimer);
        
        // UI Update
        messageContainer.innerHTML = "<div class='alert error pulse-error'>¡ALERTA MÁXIMA! CONDUCTOR SOMNOLIENTO</div>";
        overlay.innerHTML = "¡DESPIERTA!";
        overlay.className = "status-overlay error-bg";
        overlay.style.display = "flex";

        // Audios
        audioDespierto.pause();
        audioDespierto.currentTime = 0;
        
        // Play sleeping alert
        audioSomnoliento.play().catch(e => console.log("Se requiere interacción para audio", e));
        
    } else if (detectedClass.toLowerCase() === "despierto" && currentState !== "despierto") {
        currentState = "despierto";
        
        // Mensaje corto inmediato
        messageContainer.innerHTML = "<div class='alert success'>¡Qué bueno, estás muy bien!</div>";
        overlay.innerHTML = "CONDUCCIÓN SEGURA";
        overlay.className = "status-overlay success-bg";
        overlay.style.display = "flex";

        setTimeout(() => {
            if(currentState === "despierto") overlay.style.display = "none";
        }, 1200);

        audioSomnoliento.pause();
        audioSomnoliento.currentTime = 0;

        clearTimeout(awakeTimer);
        // Esperar un segundo antes de reproducir música suave
        awakeTimer = setTimeout(() => {
            if (currentState === "despierto") {
                 messageContainer.innerHTML = "<div class='alert success'>Buen trabajo. Reproduciendo música activa...</div>";
                 audioDespierto.play().catch(e => console.log("Se requiere interacción para audio", e));
            }
        }, 1000);
    }
}

function stopDetection() {
    isDetecting = false;
    if (webcam) webcam.stop();
    document.getElementById("webcam-container").innerHTML = "";
    overlay.innerHTML = "SISTEMA DETENIDO";
    overlay.className = "status-overlay";
    overlay.style.display = "flex";
    btnStart.disabled = false;
    btnStop.disabled = true;
    
    currentState = "none";
    clearTimeout(awakeTimer);
    audioDespierto.pause();
    audioSomnoliento.pause();
    messageContainer.innerHTML = "";
}
