// ===== ゲーム定数 =====
const ACTIONS = {
    DUKSHI: 'DUKSHI',      // 攻撃
    BARRIER: 'BARRIER',    // 防御
    CHARGE: 'CHARGE'       // チャージ
};

const INITIAL_STATS = {
    life: 3,
    maxLife: 3,
    mp: 3,
    maxMp: 3
};

const ACTION_COSTS = {
    DUKSHI: { mp: 1, effect: 'attack' },
    BARRIER: { mp: 1, effect: 'defense' },
    CHARGE: { mp: -1, effect: 'recovery' }
};

// ===== ゲーム状態クラス =====
class PlayerStats {
    constructor() {
        this.life = INITIAL_STATS.life;
        this.maxLife = INITIAL_STATS.maxLife;
        this.mp = INITIAL_STATS.mp;
        this.maxMp = INITIAL_STATS.maxMp;
        this.lastAction = null;
        this.consecutiveDefense = 0; // 連続防御カウンター
        this.chargeBonus = 0; // チャージボーナス（1ターン持続）
    }

    canPerformAction(action) {
        const cost = ACTION_COSTS[action].mp;
        if (action === ACTIONS.CHARGE) {
            return this.mp < this.maxMp;
        }
        // MP0の場合はチャージのみ可能
        if (this.mp === 0) {
            return action === ACTIONS.CHARGE;
        }
        return this.mp >= cost;
    }

    performAction(action) {
        if (!this.canPerformAction(action)) {
            return false;
        }
        const cost = ACTION_COSTS[action].mp;
        this.mp += cost; // cost: -1 or +1
        this.mp = Math.max(0, Math.min(this.mp, this.maxMp));
        this.lastAction = action;
        return true;
    }

    takeDamage(damage) {
        this.life = Math.max(0, this.life - damage);
    }

    recoverLife(amount) {
        this.life = Math.min(this.maxLife, this.life + amount);
    }

    getLifePercentage() {
        return (this.life / this.maxLife) * 100;
    }

    getMpPercentage() {
        return (this.mp / this.maxMp) * 100;
    }

    isAlive() {
        return this.life > 0;
    }

    reset() {
        this.life = INITIAL_STATS.life;
        this.mp = INITIAL_STATS.mp;
        this.lastAction = null;
        this.consecutiveDefense = 0;
        this.chargeBonus = 0;
    }
}

// ===== ボットAIクラス =====
class BotAI {
    constructor(difficulty = 'normal') {
        this.difficulty = difficulty;
    }

    /**
     * ボットが実行するアクションを決定
     * @param {PlayerStats} botStats - ボットのステータス
     * @param {PlayerStats} playerStats - プレイヤーのステータス
     * @returns {string} アクション
     */
    decide(botStats, playerStats) {
        const validActions = this.getValidActions(botStats);
        
        if (validActions.length === 0) {
            return ACTIONS.CHARGE;
        }

        switch (this.difficulty) {
            case 'easy':
                return this.easyDecision(validActions, botStats, playerStats);
            case 'hard':
                return this.hardDecision(validActions, botStats, playerStats);
            case 'normal':
            default:
                return this.normalDecision(validActions, botStats, playerStats);
        }
    }

    /**
     * 実行可能なアクションを取得
     */
    getValidActions(botStats) {
        const valid = [];
        if (botStats.canPerformAction(ACTIONS.DUKSHI)) {
            valid.push(ACTIONS.DUKSHI);
        }
        if (botStats.canPerformAction(ACTIONS.BARRIER)) {
            valid.push(ACTIONS.BARRIER);
        }
        if (botStats.canPerformAction(ACTIONS.CHARGE)) {
            valid.push(ACTIONS.CHARGE);
        }
        return valid;
    }

    /**
     * イージーAI: ランダムに決定
     */
    easyDecision(validActions, botStats, playerStats) {
        return validActions[Math.floor(Math.random() * validActions.length)];
    }

    /**
     * ノーマルAI: 基本戦略（戦略性を強化）
     */
    normalDecision(validActions, botStats, playerStats) {
        // MP0の場合は強制的にチャージ
        if (botStats.mp === 0) {
            return ACTIONS.CHARGE;
        }

        // 低ライフの場合は防御を優先
        if (botStats.life === 1) {
            if (validActions.includes(ACTIONS.BARRIER)) {
                return Math.random() > 0.2 ? ACTIONS.BARRIER : ACTIONS.DUKSHI;
            }
        }

        // プレイヤーの連続防御が3回以上なら攻撃で突破
        if (playerStats.consecutiveDefense >= 2 && validActions.includes(ACTIONS.DUKSHI)) {
            if (Math.random() < 0.7) return ACTIONS.DUKSHI;
        }

        // プレイヤーのチャージボーナスが溜まっているなら防御
        if (playerStats.chargeBonus >= 1 && validActions.includes(ACTIONS.BARRIER)) {
            if (Math.random() < 0.6) return ACTIONS.BARRIER;
        }

        // 自分のチャージボーナスがあれば攻撃を狙う
        if (botStats.chargeBonus >= 1 && validActions.includes(ACTIONS.DUKSHI)) {
            if (Math.random() < 0.8) return ACTIONS.DUKSHI;
        }

        // MP低下時はチャージ
        if (botStats.mp < 2 && validActions.includes(ACTIONS.CHARGE)) {
            return ACTIONS.CHARGE;
        }

        // 通常は攻撃/防御をバランスよく
        const attackChance = 0.55;
        if (Math.random() < attackChance && validActions.includes(ACTIONS.DUKSHI)) {
            return ACTIONS.DUKSHI;
        }

        if (validActions.includes(ACTIONS.BARRIER)) {
            return ACTIONS.BARRIER;
        }

        return validActions[0];
    }

    /**
     * ハードAI: 高度な戦略（戦略性を大幅に強化）
     */
    hardDecision(validActions, botStats, playerStats) {
        // MP0の場合は強制的にチャージ
        if (botStats.mp === 0) {
            return ACTIONS.CHARGE;
        }

        // ライフが危機的な場合は防御優先
        if (botStats.life <= 1 && validActions.includes(ACTIONS.BARRIER)) {
            return ACTIONS.BARRIER;
        }

        // プレイヤーのライフが低い場合は攻撃を狙う
        if (playerStats.life === 1 && validActions.includes(ACTIONS.DUKSHI)) {
            // チャージボーナスがあれば確実に狙う
            if (botStats.chargeBonus >= 1) {
                return ACTIONS.DUKSHI;
            }
            return Math.random() > 0.3 ? ACTIONS.DUKSHI : ACTIONS.BARRIER;
        }

        // プレイヤーの連続防御が多い場合は攻撃で突破を試みる
        if (playerStats.consecutiveDefense >= 2) {
            if (validActions.includes(ACTIONS.DUKSHI) && Math.random() < 0.85) {
                return ACTIONS.DUKSHI;
            }
        }

        // プレイヤーのチャージボーナスが溜まっている場合は防御
        if (playerStats.chargeBonus >= 1) {
            if (validActions.includes(ACTIONS.BARRIER) && Math.random() < 0.75) {
                return ACTIONS.BARRIER;
            }
        }

        // 自分のチャージボーナスを活用
        if (botStats.chargeBonus >= 1 && validActions.includes(ACTIONS.DUKSHI)) {
            if (Math.random() < 0.9) {
                return ACTIONS.DUKSHI;
            }
        }

        // MP管理戦略：低い場合はチャージ
        if (botStats.mp <= 1 && validActions.includes(ACTIONS.CHARGE)) {
            return ACTIONS.CHARGE;
        }

        // MP低下の警告時もチャージ考慮
        if (botStats.mp < 2 && validActions.includes(ACTIONS.CHARGE)) {
            if (Math.random() < 0.4) return ACTIONS.CHARGE;
        }

        // 相手より自分のHPが高い場合は攻撃
        if (botStats.life > playerStats.life && validActions.includes(ACTIONS.DUKSHI)) {
            if (Math.random() < 0.7) return ACTIONS.DUKSHI;
        }

        // バランス取れた選択
        const pattern = [ACTIONS.DUKSHI, ACTIONS.DUKSHI, ACTIONS.BARRIER];
        const choice = pattern[Math.floor(Math.random() * pattern.length)];

        if (validActions.includes(choice)) {
            return choice;
        }

        return validActions[Math.floor(Math.random() * validActions.length)];
    }
}

// ===== ゲームジャッジクラス =====
class GameJudge {
    /**
     * 2つのアクションの結果を判定（戦略性を考慮）
     * @param {string} playerAction - プレイヤーのアクション
     * @param {string} botAction - ボットのアクション
     * @param {PlayerStats} playerStats - プレイヤーのステータス
     * @param {PlayerStats} botStats - ボットのステータス
     * @returns {Object} 戦闘結果
     */
    judge(playerAction, botAction, playerStats, botStats) {
        const result = {
            playerAction,
            botAction,
            playerDamage: 0,
            botDamage: 0,
            message: '',
            playerMpCost: ACTION_COSTS[playerAction].mp,
            botMpCost: ACTION_COSTS[botAction].mp,
            animationType: 'none'
        };

        // 攻撃vs攻撃 - 打ち合い判定
        if (playerAction === ACTIONS.DUKSHI && botAction === ACTIONS.DUKSHI) {
            // チャージボーナスがある方が優位
            const playerDamage = 1 + playerStats.chargeBonus;
            const botDamage = 1 + botStats.chargeBonus;
            
            if (playerDamage > botDamage) {
                result.botDamage = playerDamage;
                result.message = 'プレイヤーの力強い一撃がボットを圧倒！';
                result.animationType = 'attack';
            } else if (botDamage > playerDamage) {
                result.playerDamage = botDamage;
                result.message = 'ボットの攻撃がプレイヤーを圧倒！';
                result.animationType = 'attack';
            } else {
                result.message = '同等の力で打ち合った！互いにダメージなし';
            }
        }
        // 攻撃vs防御 - 防御の連続使用で破られやすくなる
        else if (playerAction === ACTIONS.DUKSHI && botAction === ACTIONS.BARRIER) {
            // 連続防御で防ぎきれない確率が上昇
            const breakChance = Math.min(botStats.consecutiveDefense * 0.4, 0.6);
            if (Math.random() < breakChance) {
                result.botDamage = 1 + playerStats.chargeBonus;
                result.message = `バリアが破れた！デュクシが直撃（防御${botStats.consecutiveDefense}連続）`;
                result.animationType = 'attack';
            } else {
                result.message = 'バリアで防衛成功！';
            }
        }
        // 防御vs攻撃
        else if (playerAction === ACTIONS.BARRIER && botAction === ACTIONS.DUKSHI) {
            const breakChance = Math.min(playerStats.consecutiveDefense * 0.4, 0.6);
            if (Math.random() < breakChance) {
                result.playerDamage = 1 + botStats.chargeBonus;
                result.message = `バリアが破れた！ボットのデュクシが直撃（防御${playerStats.consecutiveDefense}連続）`;
                result.animationType = 'attack';
            } else {
                result.message = 'バリアで自分の攻撃を防いだ！';
            }
        }
        // 攻撃vs チャージ - 無防備を狙い撃ち
        else if (playerAction === ACTIONS.DUKSHI && botAction === ACTIONS.CHARGE) {
            result.botDamage = 1 + playerStats.chargeBonus;
            result.message = 'チャージ中のボットに隙を見て直撃！';
            result.animationType = 'attack';
        }
        // チャージvs攻撃
        else if (playerAction === ACTIONS.CHARGE && botAction === ACTIONS.DUKSHI) {
            result.playerDamage = 1 + botStats.chargeBonus;
            result.message = 'チャージ中に無防備を狙われた！ボットの攻撃が直撃';
            result.animationType = 'attack';
        }
        // 防御vs防御 - 互いに守りを固める
        else if (playerAction === ACTIONS.BARRIER && botAction === ACTIONS.BARRIER) {
            result.message = '互いに防戦態勢。硬い防御の応酬';
            result.animationType = 'defense';
        }
        // 防御vs チャージ - 攻撃側優位
        else if (playerAction === ACTIONS.BARRIER && botAction === ACTIONS.CHARGE) {
            // 防御がボットのチャージを受ける
            if (playerStats.consecutiveDefense > 1) {
                result.message = '連続防御が功を奏し、ボットのチャージを耐える';
            } else {
                result.message = '互いに無防備...何も起こらなかった';
            }
        }
        // チャージvs防御
        else if (playerAction === ACTIONS.CHARGE && botAction === ACTIONS.BARRIER) {
            if (botStats.consecutiveDefense > 1) {
                result.message = 'ボットの連続防御がプレイヤーのチャージを耐える';
            } else {
                result.message = '互いに無防備...何も起こらなかった';
            }
        }
        // チャージvs チャージ - MP充填中
        else if (playerAction === ACTIONS.CHARGE && botAction === ACTIONS.CHARGE) {
            result.message = '互いにチャージ...MP充填中。力が溜まっていく';
            result.animationType = 'charge';
        }

        return result;
    }
}

// ===== メインゲームクラス =====
class DukshiGame {
    constructor() {
        this.playerStats = new PlayerStats();
        this.botStats = new PlayerStats();
        this.botAI = new BotAI('normal');
        this.judge = new GameJudge();
        this.turn = 1;
        this.gameRunning = false;
        this.processedAction = false;
        this.playerAction = null;
        this.botAction = null;

        this.initializeUI();
        this.setupEventListeners();
    }

    /**
     * UI要素の初期化
     */
    initializeUI() {
        this.elements = {
            gameStatus: null,
            roundNumber: document.getElementById('roundNumber'),
            playerLifeValue: document.getElementById('playerLifeValue'),
            playerMpValue: document.getElementById('playerMpValue'),
            playerLife: document.getElementById('playerLife'),
            playerMp: document.getElementById('playerMp'),
            botLifeValue: document.getElementById('botLifeValue'),
            botMpValue: document.getElementById('botMpValue'),
            botLife: document.getElementById('botLife'),
            botMp: document.getElementById('botMp'),
            turnCounter: document.getElementById('turnCounter'),
            battleVisual: document.getElementById('battleVisual'),
            playerActionLog: document.getElementById('playerActionLog'),
            botActionLog: document.getElementById('botActionLog'),
            commandSection: document.getElementById('commandSection'),
            cmdAttack: document.getElementById('cmdAttack'),
            cmdDefense: document.getElementById('cmdDefense'),
            cmdCharge: document.getElementById('cmdCharge'),
            gameOverModal: document.getElementById('gameOverModal'),
            gameOverTitle: document.getElementById('gameOverTitle'),
            gameOverMessage: document.getElementById('gameOverMessage'),
            btnRestart: document.getElementById('btnRestart'),
            waitingMessage: document.getElementById('waitingMessage'),
            clearTurns: document.getElementById('clearTurns'),
            buttonContainer: document.getElementById('buttonContainer')
        };

        this.updateAllUI();
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        this.elements.cmdAttack.addEventListener('click', () => this.selectAction(ACTIONS.DUKSHI));
        this.elements.cmdDefense.addEventListener('click', () => this.selectAction(ACTIONS.BARRIER));
        this.elements.cmdCharge.addEventListener('click', () => this.selectAction(ACTIONS.CHARGE));
        this.elements.btnRestart.addEventListener('click', () => this.restart());

        this.updateCommandButtons();
    }

    /**
     * プレイヤーがアクションを選択
     */
    selectAction(action) {
        if (!this.gameRunning || this.processedAction) {
            return;
        }

        if (!this.playerStats.canPerformAction(action)) {
            this.addBattleLog('そのアクションは実行できません（MP不足またはルール外）');
            return;
        }

        this.playerAction = action;
        this.processedAction = true;

        // UIを更新（ボタンをハイライト）
        this.updateCommandButtons();
        this.elements.waitingMessage.style.display = 'block';

        // ボットの遅延決定（ゲーム感の演出）
        setTimeout(() => {
            this.botAction = this.botAI.decide(this.botStats, this.playerStats);
            this.executeTurn();
        }, 800 + Math.random() * 400);
    }

    /**
     * ターンを実行
     */
    executeTurn() {
        if (!this.playerAction || !this.botAction) {
            return;
        }

        // アクション実行
        this.playerStats.performAction(this.playerAction);
        this.botStats.performAction(this.botAction);

        // チャージボーナスの適用と更新
        // チャージボーナスは前のターンのチャージから付与
        // 次のターン以降チャージボーナスはリセット対象
        
        // 判定（戦略性を考慮）
        const result = this.judge.judge(this.playerAction, this.botAction, this.playerStats, this.botStats);

        // ダメージ適用
        if (result.playerDamage > 0) {
            this.playerStats.takeDamage(result.playerDamage);
        }
        if (result.botDamage > 0) {
            this.botStats.takeDamage(result.botDamage);
        }

        // 戦略状態の更新
        // 連続防御カウンター
        if (this.playerAction === ACTIONS.BARRIER) {
            this.playerStats.consecutiveDefense++;
        } else {
            this.playerStats.consecutiveDefense = 0;
        }

        if (this.botAction === ACTIONS.BARRIER) {
            this.botStats.consecutiveDefense++;
        } else {
            this.botStats.consecutiveDefense = 0;
        }

        // チャージボーナスの処理
        // 攻撃を使った場合、チャージボーナスを消費
        if (this.playerAction === ACTIONS.DUKSHI) {
            this.playerStats.chargeBonus = 0;
        }
        // チャージを使った場合、次のターンのボーナスを一つ増やす
        if (this.playerAction === ACTIONS.CHARGE) {
            this.playerStats.chargeBonus = Math.min(this.playerStats.chargeBonus + 1, 2);
        }

        if (this.botAction === ACTIONS.DUKSHI) {
            this.botStats.chargeBonus = 0;
        }
        if (this.botAction === ACTIONS.CHARGE) {
            this.botStats.chargeBonus = Math.min(this.botStats.chargeBonus + 1, 2);
        }

        // ログ出力
        const actionNames = {
            DUKSHI: 'デュクシ',
            BARRIER: 'バリア',
            CHARGE: 'チャージ'
        };

        // アクションログを更新
        this.elements.playerActionLog.textContent = `YOU: ${actionNames[this.playerAction]}`;
        this.elements.botActionLog.textContent = `BOT: ${actionNames[this.botAction]}`;
        
        // バトルビジュアル更新
        this.elements.battleVisual.textContent = result.message;

        // UI更新
        this.updateAllUI();

        // 勝敗判定
        if (!this.playerStats.isAlive()) {
            this.gameEnd(false);
            return;
        }
        if (!this.botStats.isAlive()) {
            this.gameEnd(true);
            return;
        }

        // 次のターン
        this.turn++;
        this.playerAction = null;
        this.botAction = null;
        this.processedAction = false;
        this.elements.waitingMessage.style.display = 'none';
        this.updateCommandButtons();
    }

    /**
     * ゲーム終了
     */
    gameEnd(playerWon) {
        this.gameRunning = false;
        this.elements.cmdAttack.disabled = true;
        this.elements.cmdDefense.disabled = true;
        this.elements.cmdCharge.disabled = true;

        if (playerWon) {
            this.elements.gameOverTitle.textContent = '🎉 VICTORY! 🎉';
            this.elements.gameOverMessage.textContent = `あなたが${this.turn - 1}ターンで相手を倒しました！`;
            this.elements.clearTurns.textContent = this.turn - 1;
        } else {
            this.elements.gameOverTitle.textContent = '💔 GAME OVER 💔';
            this.elements.gameOverMessage.textContent = `ボットが${this.turn - 1}ターンであなたを倒しました...`;
            this.elements.clearTurns.textContent = this.turn - 1;
        }

        this.elements.gameOverModal.style.display = 'flex';
    }

    /**
     * ゲームを再開
     */
    restart() {
        this.playerStats.reset();
        this.botStats.reset();
        this.turn = 1;
        this.gameRunning = true;
        this.processedAction = false;
        this.playerAction = null;
        this.botAction = null;

        this.elements.gameOverModal.style.display = 'none';
        this.elements.battleVisual.textContent = '準備完了';
        this.elements.playerActionLog.textContent = '---';
        this.elements.botActionLog.textContent = '---';
        this.elements.cmdAttack.disabled = false;
        this.elements.cmdDefense.disabled = false;
        this.elements.cmdCharge.disabled = false;

        this.updateAllUI();
        this.updateCommandButtons();
    }

    /**
     * ゲーム開始
     */
    start() {
        this.gameRunning = true;
        this.updateAllUI();
        this.addBattleLog('ゲーム開始！「デュクシ！」');
    }

    /**
     * 全UIを更新
     */
    updateAllUI() {
        // プレイヤーステータス
        this.elements.playerLifeValue.textContent = `${this.playerStats.life}/${this.playerStats.maxLife}`;
        this.elements.playerMpValue.textContent = `${this.playerStats.mp}/${this.playerStats.maxMp}`;
        this.elements.playerLife.style.width = `${this.playerStats.getLifePercentage()}%`;
        this.elements.playerMp.style.width = `${this.playerStats.getMpPercentage()}%`;

        // ボットステータス
        this.elements.botLifeValue.textContent = `${this.botStats.life}/${this.botStats.maxLife}`;
        this.elements.botMpValue.textContent = `${this.botStats.mp}/${this.botStats.maxMp}`;
        this.elements.botLife.style.width = `${this.botStats.getLifePercentage()}%`;
        this.elements.botMp.style.width = `${this.botStats.getMpPercentage()}%`;

        // ターン・ラウンド
        this.elements.turnCounter.textContent = this.turn;
        this.elements.roundNumber.textContent = 1; // 現在はラウンド1で固定
    }

    /**
     * コマンドボタンの状態を更新
     */
    updateCommandButtons() {
        // ボタンの有効/無効状態を更新
        const canAttack = this.playerStats.canPerformAction(ACTIONS.DUKSHI);
        const canDefense = this.playerStats.canPerformAction(ACTIONS.BARRIER);
        const canCharge = this.playerStats.canPerformAction(ACTIONS.CHARGE);

        this.elements.cmdAttack.disabled = !canAttack || this.processedAction;
        this.elements.cmdDefense.disabled = !canDefense || this.processedAction;
        this.elements.cmdCharge.disabled = !canCharge || this.processedAction;

        // アクティブクラスを付与
        this.elements.cmdAttack.classList.remove('active');
        this.elements.cmdDefense.classList.remove('active');
        this.elements.cmdCharge.classList.remove('active');

        if (this.playerAction === ACTIONS.DUKSHI) {
            this.elements.cmdAttack.classList.add('active');
        }
        if (this.playerAction === ACTIONS.BARRIER) {
            this.elements.cmdDefense.classList.add('active');
        }
        if (this.playerAction === ACTIONS.CHARGE) {
            this.elements.cmdCharge.classList.add('active');
        }
    }

    /**
     * バトルログを追加
     */
    addBattleLog(message) {
        // ゲーム関数内で使用される関数です
    }
}

// ===== ゲーム初期化 =====
document.addEventListener('DOMContentLoaded', () => {
    const game = new DukshiGame();
    game.start();
});
