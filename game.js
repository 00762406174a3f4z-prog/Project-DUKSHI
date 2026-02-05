// ===== ゲーム定数 =====
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

const GRAVITY = 0.6;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 50;
const GROUND_Y = CANVAS_HEIGHT - 60;

// 攻撃関連
const ATTACK_RANGE = 80;
const ATTACK_DAMAGE = 1;
const ATTACK_COOLDOWN = 60; // フレーム

// ブロック関連
const BLOCK_RANGE = 70;

// ゲーム状態
class Character {
    constructor(x, isPlayer = true) {
        this.x = x;
        this.y = GROUND_Y;
        this.vx = 0; // 水平速度
        this.vy = 0; // 垂直速度
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        
        this.health = 3;
        this.maxHealth = 3;
        this.isPlayer = isPlayer;
        
        this.isBlocking = false;
        this.isJumping = false;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.attackDirection = 1; // 1 = right, -1 = left
        
        this.lastAttackTime = 0;
        
        this.emoji = isPlayer ? '🥋' : '🤖';
    }
    
    update() {
        // 重力の適用
        if (this.y < GROUND_Y) {
            this.vy += GRAVITY;
        } else {
            this.y = GROUND_Y;
            this.vy = 0;
            this.isJumping = false;
        }
        
        // 移動
        this.x += this.vx;
        this.y += this.vy;
        
        // 画面の端の処理
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;
        
        // 攻撃クールダウン
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
    }
    
    draw(ctx) {
        // キャラクター描画
        ctx.save();
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // ブロック中は別の色
        if (this.isBlocking) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            ctx.globalAlpha = 1;
        }
        
        // ダメージ時はフラッシュ
        const now = Date.now();
        if (this.lastAttackTime && now - this.lastAttackTime < 200) {
            ctx.filter = 'brightness(1.5)';
        }
        
        ctx.fillText(this.emoji, this.x, this.y);
        ctx.restore();
    }
    
    jump() {
        if (!this.isJumping && this.y >= GROUND_Y) {
            this.vy = -12;
            this.isJumping = true;
        }
    }
    
    attack(targetX) {
        if (this.attackCooldown > 0) return false;
        
        this.isAttacking = true;
        this.attackDirection = targetX > this.x ? 1 : -1;
        this.attackCooldown = ATTACK_COOLDOWN;
        return true;
    }
    
    block() {
        this.isBlocking = true;
    }
    
    stopBlocking() {
        this.isBlocking = false;
    }
    
    takeDamage(damage) {
        if (!this.isBlocking) {
            this.health -= damage;
            this.health = Math.max(0, this.health);
            this.lastAttackTime = Date.now();
        } else {
            // ブロック中でも軽いダメージ
            this.health -= Math.ceil(damage * 0.3);
            this.health = Math.max(0, this.health);
        }
    }
    
    isAlive() {
        return this.health > 0;
    }
    
    getDistance(other) {
        return Math.abs(this.x - other.x);
    }
    
    reset() {
        this.x = this.isPlayer ? 100 : CANVAS_WIDTH - 100;
        this.y = GROUND_Y;
        this.vx = 0;
        this.vy = 0;
        this.health = this.maxHealth;
        this.isBlocking = false;
        this.isJumping = false;
        this.isAttacking = false;
        this.attackCooldown = 0;
    }
}

// AIボット
class AIBot {
    constructor(character) {
        this.character = character;
        this.decisionTimer = 0;
        this.currentAction = null;
    }
    
    update(playerChar) {
        this.decisionTimer--;
        
        // 定期的に新しい判断
        if (this.decisionTimer <= 0) {
            this.makeDecision(playerChar);
            this.decisionTimer = 60; // 60フレームごと
        }
        
        // 現在のアクションを実行
        this.executeAction(playerChar);
    }
    
    makeDecision(playerChar) {
        const distance = this.character.getDistance(playerChar);
        const healthRatio = this.character.health / this.character.maxHealth;
        const playerHealthRatio = playerChar.health / playerChar.maxHealth;
        
        // 攻撃範囲
        if (distance < ATTACK_RANGE && !playerChar.isBlocking) {
            if (Math.random() < 0.7) {
                this.currentAction = 'attack';
                return;
            }
        }
        
        // ブロック判定
        if (distance < ATTACK_RANGE + 20 && playerChar.isAttacking) {
            if (Math.random() < 0.8 && this.character.health > 1) {
                this.currentAction = 'block';
                return;
            }
        }
        
        // 低HP時は防御を優先
        if (healthRatio < 0.4) {
            if (Math.random() < 0.6) {
                this.currentAction = 'block';
                return;
            }
        }
        
        // 移動
        if (distance > ATTACK_RANGE) {
            if (playerChar.x > this.character.x) {
                this.currentAction = 'moveRight';
            } else {
                this.currentAction = 'moveLeft';
            }
        } else {
            this.currentAction = 'idle';
        }
    }
    
    executeAction(playerChar) {
        const distance = this.character.getDistance(playerChar);
        
        switch (this.currentAction) {
            case 'attack':
                if (distance < ATTACK_RANGE) {
                    this.character.attack(playerChar.x);
                }
                break;
            case 'block':
                this.character.block();
                break;
            case 'moveRight':
                this.character.vx = 3;
                break;
            case 'moveLeft':
                this.character.vx = -3;
                break;
            case 'idle':
                this.character.vx = 0;
                this.character.stopBlocking();
                break;
        }
    }
}

// メインゲーム
class DukshiGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.player = new Character(100, true);
        this.bot = new Character(CANVAS_WIDTH - 100, false);
        this.ai = new AIBot(this.bot);
        
        this.gameRunning = false;
        this.gameOverTime = null;
        
        // キー入力管理
        this.keys = {};
        
        this.setupEventListeners();
        this.start();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                if (this.gameRunning) {
                    this.player.attack(this.bot.x);
                }
            }
            if (e.key === 'Shift') {
                e.preventDefault();
                if (this.gameRunning) {
                    this.player.block();
                }
            }
            if (e.key === 'w' || e.key === 'W') {
                e.preventDefault();
                if (this.gameRunning) {
                    this.player.jump();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            
            if (e.key === 'Shift') {
                this.player.stopBlocking();
            }
        });
        
        document.getElementById('btnRestart').addEventListener('click', () => {
            this.restart();
        });
    }
    
    handlePlayerInput() {
        if (!this.gameRunning) return;
        
        // 左右移動
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            this.player.vx = -4;
        } else if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            this.player.vx = 4;
        } else {
            this.player.vx = 0;
        }
    }
    
    update() {
        if (!this.gameRunning) return;
        
        this.handlePlayerInput();
        
        // キャラクター更新
        this.player.update();
        this.bot.update();
        
        // AI更新
        this.ai.update(this.player);
        
        // 攻撃判定
        this.checkAttackCollisions();
        
        // ゲームオーバー判定
        if (!this.player.isAlive()) {
            this.gameEnd(false);
        }
        if (!this.bot.isAlive()) {
            this.gameEnd(true);
        }
        
        // UI更新
        this.updateUI();
    }
    
    checkAttackCollisions() {
        const distance = this.player.getDistance(this.bot);
        
        // プレイヤーの攻撃判定
        if (this.player.isAttacking && this.player.attackCooldown === ATTACK_COOLDOWN) {
            if (distance < ATTACK_RANGE) {
                this.bot.takeDamage(ATTACK_DAMAGE);
            }
        }
        
        // ボットの攻撃判定
        if (this.bot.isAttacking && this.bot.attackCooldown === ATTACK_COOLDOWN) {
            if (distance < ATTACK_RANGE) {
                this.player.takeDamage(ATTACK_DAMAGE);
            }
        }
    }
    
    draw() {
        // 背景
        this.ctx.fillStyle = '#1a1a4d';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // グラデーション背景
        const grad = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        grad.addColorStop(0, 'rgba(42, 82, 152, 0.3)');
        grad.addColorStop(1, 'rgba(26, 26, 77, 0.8)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // 地面
        this.ctx.fillStyle = '#66ff00';
        this.ctx.fillRect(0, GROUND_Y + this.player.height / 2, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y - this.player.height / 2);
        
        // キャラクター描画
        this.player.draw(this.ctx);
        this.bot.draw(this.ctx);
        
        // 攻撃範囲の視覚化（デバッグ）
        if (this.player.isAttacking) {
            this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.arc(this.player.x, this.player.y, ATTACK_RANGE, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        if (this.bot.isAttacking) {
            this.ctx.strokeStyle = 'rgba(100, 100, 255, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.bot.x, this.bot.y, ATTACK_RANGE, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
    
    updateUI() {
        // ヘルスバー
        const playerHealthBar = document.getElementById('playerHealthBar');
        const botHealthBar = document.getElementById('botHealthBar');
        const playerHealthText = document.getElementById('playerHealthText');
        const botHealthText = document.getElementById('botHealthText');
        
        const playerPercent = (this.player.health / this.player.maxHealth) * 100;
        const botPercent = (this.bot.health / this.bot.maxHealth) * 100;
        
        playerHealthBar.style.setProperty('--health', playerPercent + '%');
        botHealthBar.style.setProperty('--health', botPercent + '%');
        
        playerHealthText.textContent = `${this.player.health}/${this.player.maxHealth}`;
        botHealthText.textContent = `${this.bot.health}/${this.bot.maxHealth}`;
    }
    
    gameEnd(playerWon) {
        this.gameRunning = false;
        
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const message = document.getElementById('gameOverMessage');
        
        if (playerWon) {
            title.textContent = '🎉 勝利！ 🎉';
            message.textContent = 'あなたが勝ちました！';
        } else {
            title.textContent = '💔 敗北 💔';
            message.textContent = 'ボットに負けました...';
        }
        
        modal.style.display = 'flex';
    }
    
    restart() {
        this.player.reset();
        this.bot.reset();
        this.gameRunning = true;
        document.getElementById('gameOverModal').style.display = 'none';
    }
    
    start() {
        this.gameRunning = true;
        this.gameLoop();
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// ゲーム初期化
document.addEventListener('DOMContentLoaded', () => {
    const game = new DukshiGame();
});
