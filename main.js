const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let stars = [];
let explosions = [];
let level = 1;
let totalLevels = 10;
let starsPerLevel = 10;

let totalDestroyed = 0;   // ⭐ acumulativo
let totalMissed = 0;      // ❌ acumulativo

let animationId;
let isPaused = false;
let gameStarted = false;

const progressBar = document.getElementById("progressBar");
const levelText = document.getElementById("level");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

const destroyedText = document.getElementById("eliminadas");
const missedText = document.getElementById("escapadas");

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

// ⭐ STAR
class Star{
    constructor(speed){
        this.radius = 18;
        this.x = 0;
        this.y = canvas.height + Math.random()*150;

        this.speedY = speed + Math.random()*0.5;
        this.speedX = (Math.random() - 0.5) * 1.5;
    }

    draw(){
        ctx.save();

        let gradient = ctx.createRadialGradient(
            this.x, this.y, 5,
            this.x, this.y, this.radius
        );

        gradient.addColorStop(0, "#ffff99");
        gradient.addColorStop(1, "#ffcc00");

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
        ctx.restore();
    }

    update(){
        this.y -= this.speedY;
        this.x += this.speedX;

        if(this.x < this.radius || this.x > canvas.width - this.radius){
            this.speedX *= -1;
        }
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

// 🔥 COLISIONES ENTRE ESTRELLAS
function resolveCollisions(){
    for(let i = 0; i < stars.length; i++){
        for(let j = i + 1; j < stars.length; j++){

            let starA = stars[i];
            let starB = stars[j];

            let dx = starB.x - starA.x;
            let dy = starB.y - starA.y;
            let distance = Math.sqrt(dx*dx + dy*dy);

            let minDistance = starA.radius + starB.radius;

            if(distance <= minDistance){

                let angle = Math.atan2(dy, dx);
                let overlap = minDistance - distance;

                let separationX = Math.cos(angle) * overlap / 2;
                let separationY = Math.sin(angle) * overlap / 2;

                starA.x -= separationX;
                starA.y -= separationY;

                starB.x += separationX;
                starB.y += separationY;
            }
        }
    }
}

// ✅ Barra basada en niveles (ahora llega a 100%)
function updateProgress(){
    let percent = (level / totalLevels) * 100;

    progressBar.style.width = percent + "%";
    progressBar.innerText = level + " / " + totalLevels;
}

// Crear estrellas
function createStars(){
    stars = [];
    let speed = 0.7 + (level * 0.2);

    for(let i=0;i<starsPerLevel;i++){
        let newStar = new Star(speed);
        newStar.x = Math.random() * (canvas.width - newStar.radius*2) + newStar.radius;
        stars.push(newStar);
    }
}

function checkLevelComplete(){
    if(stars.length === 0){
        if(level < totalLevels){
            level++;
            levelText.innerText = level;
            updateProgress();
            createStars();
        }else{
            updateProgress(); // queda en 10/10 y 100%
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
            totalMissed++;
            missedText.innerText = totalMissed;
        }
    });

    // 🔥 Evita que se encimen
    resolveCollisions();

    explosions.forEach((exp,index)=>{
        exp.update();
        exp.draw();
        if(exp.alpha <= 0){
            explosions.splice(index,1);
        }
    });

    if(gameStarted){
        checkLevelComplete();
    }

    animationId = requestAnimationFrame(animate);
}

canvas.addEventListener("click",(e)=>{
    if(!gameStarted || isPaused) return;

    const rect = canvas.getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    let clickY = e.clientY - rect.top;

    for(let i=stars.length-1;i>=0;i--){
        let star = stars[i];
        let dx = clickX - star.x;
        let dy = clickY - star.y;
        let dist = Math.sqrt(dx*dx + dy*dy);

        if(dist <= star.radius){
            playPopSound();
            explosions.push(new Explosion(star.x,star.y));
            stars.splice(i,1);

            totalDestroyed++;
            destroyedText.innerText = totalDestroyed;
            break;
        }
    }
});

startBtn.addEventListener("click",()=>{
    if(!gameStarted){
        gameStarted = true;
        createStars();
        updateProgress();
        startBtn.disabled = true;
    }
});

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

restartBtn.addEventListener("click",()=>{
    cancelAnimationFrame(animationId);

    level = 1;
    stars = [];
    explosions = [];
    totalDestroyed = 0;
    totalMissed = 0;

    destroyedText.innerText = 0;
    missedText.innerText = 0;

    levelText.innerText = level;
    updateProgress();

    gameStarted = false;
    isPaused = false;

    startBtn.disabled = false;
    pauseBtn.innerText = "⏸ Pausar";

    animate();
});

animate();










