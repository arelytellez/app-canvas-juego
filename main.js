const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let stars = [];
let explosions = [];
let level = 1;
let totalLevels = 10;
let starsPerLevel = 10;
let totalStars = totalLevels * starsPerLevel;
let destroyedStars = 0;

let animationId;
let isPaused = false;
let gameStarted = false;

const progressBar = document.getElementById("progressBar");
const levelText = document.getElementById("level");
const destroyedText = document.getElementById("destroyedCount");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

// 🔊 AUDIO CONTEXT (soluciona bloqueo navegador)
let audioContext;

function playPopSound(){
    if(!audioContext){
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = "square";
    oscillator.frequency.value = 500;

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.2
    );

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
}

let mouseX = 0;
let mouseY = 0;

// ⭐ CLASE STAR
class Star{
    constructor(speed){
        this.radius = 18;
        this.x = Math.random() * (canvas.width - this.radius*2);
        this.y = canvas.height + Math.random()*200;
        this.speedY = speed;
        this.speedX = (Math.random() - 0.5) * 2;
        this.hover = false;
    }

    draw(){
        ctx.save();

        let gradient = ctx.createRadialGradient(
            this.x, this.y, 5,
            this.x, this.y, this.radius
        );

        if(this.hover){
            gradient.addColorStop(0, "#ffffff");
            gradient.addColorStop(1, "#ff4081");
        }else{
            gradient.addColorStop(0, "#ffff99");
            gradient.addColorStop(1, "#ffcc00");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();

        for(let i=0;i<5;i++){
            ctx.lineTo(
                this.x + this.radius * Math.cos((18 + i*72) * Math.PI/180),
                this.y - this.radius * Math.sin((18 + i*72) * Math.PI/180)
            );
            ctx.lineTo(
                this.x + (this.radius/2) * Math.cos((54 + i*72) * Math.PI/180),
                this.y - (this.radius/2) * Math.sin((54 + i*72) * Math.PI/180)
            );
        }

        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 20;
        ctx.shadowColor = "white";

        ctx.restore();
    }

    update(){
        this.y -= this.speedY;
        this.x += this.speedX;

        if(this.x < this.radius || this.x > canvas.width - this.radius){
            this.speedX *= -1;
        }

        let dx = mouseX - this.x;
        let dy = mouseY - this.y;
        this.hover = Math.sqrt(dx*dx + dy*dy) < this.radius;
    }
}

// 💥 EXPLOSION
class Explosion{
    constructor(x,y){
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.alpha = 1;
    }

    draw(){
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);
        ctx.fillStyle="orange";
        ctx.fill();
        ctx.restore();
    }

    update(){
        this.radius += 3;
        this.alpha -= 0.05;
    }
}

// Crear estrellas
function createStars(){
    stars = [];
    let speed = 0.5 + (level * 0.5);

    for(let i=0;i<starsPerLevel;i++){
        stars.push(new Star(speed));
    }
}

// Mostrar nivel dentro del canvas
function drawLevelText(){
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Nivel " + level, canvas.width/2, 60);
    ctx.restore();
}

// Mouse
canvas.addEventListener("mousemove",(e)=>{
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

// Click
canvas.addEventListener("click",()=>{
    if(!gameStarted || isPaused) return;

    for(let i=stars.length-1;i>=0;i--){
        let star = stars[i];
        let dx = mouseX - star.x;
        let dy = mouseY - star.y;
        let dist = Math.sqrt(dx*dx + dy*dy);

        if(dist < star.radius){
            playPopSound(); // 🔊 sonido garantizado

            explosions.push(new Explosion(star.x,star.y));
            stars.splice(i,1);
            destroyedStars++;

            destroyedText.innerText = destroyedStars;
            updateProgress();
            break;
        }
    }
});

function updateProgress(){
    let percent = (destroyedStars / totalStars) * 100;
    progressBar.style.width = percent + "%";
    progressBar.innerText = Math.floor(percent) + "%";
}

function checkLevelComplete(){
    if(stars.length === 0){
        if(level < totalLevels){
            level++;
            levelText.innerText = level;
            createStars();
        }else{
            alert("🎉 ¡Completaste los 10 niveles!");
        }
    }
}

function animate(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    stars.forEach((star,index)=>{
        star.update();
        star.draw();

        if(star.y + star.radius < 0){
            stars.splice(index,1);
        }
    });

    explosions.forEach((exp,index)=>{
        exp.update();
        exp.draw();
        if(exp.alpha <= 0){
            explosions.splice(index,1);
        }
    });

    if(gameStarted){
        drawLevelText();
        checkLevelComplete();
    }

    animationId = requestAnimationFrame(animate);
}

// ▶ BOTÓN JUGAR
startBtn.addEventListener("click",()=>{
    if(!gameStarted){
        gameStarted = true;
        createStars();
        startBtn.disabled = true;
    }
});

// ⏸ PAUSAR
pauseBtn.addEventListener("click",()=>{
    if(!gameStarted) return;

    if(!isPaused){
        cancelAnimationFrame(animationId);
        pauseBtn.innerText = "▶ Reanudar";
        isPaused = true;
    }else{
        animate();
        pauseBtn.innerText = "⏸ Pausar";
        isPaused = false;
    }
});

// 🔄 REINICIAR
restartBtn.addEventListener("click",()=>{
    cancelAnimationFrame(animationId);

    level = 1;
    destroyedStars = 0;
    stars = [];
    explosions = [];

    levelText.innerText = level;
    destroyedText.innerText = destroyedStars;
    updateProgress();

    gameStarted = false;
    isPaused = false;

    startBtn.disabled = false;
    pauseBtn.innerText = "⏸ Pausar";

    animate();
});

// Inicia loop pero sin juego activo
animate();






