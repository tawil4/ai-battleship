class BattleshipGame {
    constructor() {
        this.GRID_SIZE = 10;
        this.ships = [
            { name: 'Carrier', size: 5, placed: false },
            { name: 'Battleship', size: 4, placed: false },
            { name: 'Cruiser', size: 3, placed: false },
            { name: 'Submarine', size: 3, placed: false },
            { name: 'Destroyer', size: 2, placed: false }
        ];
        
        this.playerGrid = this.createEmptyGrid();
        this.aiGrid = this.createEmptyGrid();
        this.playerShips = [];
        this.aiShips = [];
        
        this.gameStarted = false;
        this.gameOver = false;
        this.currentPlayer = 'player';
        this.isHorizontal = true;
        this.currentShipIndex = 0;
        
        this.shotsFired = 0;
        this.hits = 0;
        this.shipsSunk = 0;
        
        this.aiLastHit = null;
        this.aiTargets = [];
        this.aiHitHistory = [];
        this.aiDetectedOrientation = null;
        
        this.initializeDOM();
        this.setupEventListeners();
        this.renderGrids();
        this.updateShipsToPlace();
    }
    
    createEmptyGrid() {
        return Array(this.GRID_SIZE).fill().map(() => Array(this.GRID_SIZE).fill(0));
    }
    
    initializeDOM() {
        this.playerGridElement = document.getElementById('playerGrid');
        this.aiGridElement = document.getElementById('aiGrid');
        this.gameStatus = document.getElementById('gameStatus');
        this.rotateBtn = document.getElementById('rotateBtn');
        this.randomBtn = document.getElementById('randomBtn');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.shotsFiredElement = document.getElementById('shotsFired');
        this.hitsElement = document.getElementById('hits');
        this.shipsSunkElement = document.getElementById('shipsSunk');
    }
    
    setupEventListeners() {
        this.rotateBtn.addEventListener('click', () => {
            this.isHorizontal = !this.isHorizontal;
            this.rotateBtn.textContent = this.isHorizontal ? 'Rotate Ship' : 'Rotate Ship (Vertical)';
        });
        
        this.randomBtn.addEventListener('click', () => this.randomPlacement());
        this.startBtn.addEventListener('click', () => this.startGame());
        this.resetBtn.addEventListener('click', () => this.resetGame());
    }
    
    renderGrids() {
        this.renderGrid(this.playerGridElement, this.playerGrid, true);
        this.renderGrid(this.aiGridElement, this.aiGrid, false);
    }
    
    renderGrid(gridElement, grid, isPlayerGrid) {
        gridElement.innerHTML = '';
        
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                const cellValue = grid[row][col];
                
                if (cellValue === 1 && isPlayerGrid) {
                    cell.classList.add('ship');
                } else if (cellValue === 2) {
                    cell.classList.add('hit');
                    cell.textContent = '💥';
                } else if (cellValue === 3) {
                    cell.classList.add('miss');
                    cell.textContent = '💧';
                } else if (cellValue === 4) {
                    cell.classList.add('sunk');
                    cell.textContent = '💀';
                }
                
                if (isPlayerGrid && !this.gameStarted) {
                    cell.addEventListener('click', (e) => this.handlePlayerGridClick(e));
                    cell.addEventListener('mouseenter', (e) => this.showShipPreview(e));
                    cell.addEventListener('mouseleave', () => this.clearPreview());
                } else if (!isPlayerGrid && this.gameStarted && this.currentPlayer === 'player') {
                    cell.addEventListener('click', (e) => this.handleAIGridClick(e));
                }
                
                gridElement.appendChild(cell);
            }
        }
    }
    
    handlePlayerGridClick(e) {
        if (this.gameStarted || this.currentShipIndex >= this.ships.length) return;
        
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        
        if (this.canPlaceShip(this.playerGrid, row, col, this.ships[this.currentShipIndex].size, this.isHorizontal)) {
            this.placeShip(this.playerGrid, row, col, this.ships[this.currentShipIndex].size, this.isHorizontal);
            this.playerShips.push({
                ...this.ships[this.currentShipIndex],
                row, col,
                horizontal: this.isHorizontal,
                hits: 0
            });
            
            this.ships[this.currentShipIndex].placed = true;
            this.currentShipIndex++;
            
            this.renderGrids();
            this.updateShipsToPlace();
            
            if (this.currentShipIndex >= this.ships.length) {
                this.gameStatus.textContent = 'All ships placed! Ready to start battle.';
                this.startBtn.disabled = false;
                this.rotateBtn.disabled = true;
            }
        }
    }
    
    handleAIGridClick(e) {
        if (this.currentPlayer !== 'player' || this.gameOver) return;
        
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        
        if (this.aiGrid[row][col] === 2 || this.aiGrid[row][col] === 3) return;
        
        this.playerShoot(row, col);
    }
    
    showShipPreview(e) {
        if (this.gameStarted || this.currentShipIndex >= this.ships.length) return;
        
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        const shipSize = this.ships[this.currentShipIndex].size;
        
        this.clearPreview();
        
        const canPlace = this.canPlaceShip(this.playerGrid, row, col, shipSize, this.isHorizontal);
        const previewClass = canPlace ? 'preview' : 'invalid-preview';
        
        for (let i = 0; i < shipSize; i++) {
            const previewRow = this.isHorizontal ? row : row + i;
            const previewCol = this.isHorizontal ? col + i : col;
            
            if (previewRow >= 0 && previewRow < this.GRID_SIZE && 
                previewCol >= 0 && previewCol < this.GRID_SIZE) {
                const cell = this.playerGridElement.children[previewRow * this.GRID_SIZE + previewCol];
                cell.classList.add(previewClass);
            }
        }
    }
    
    clearPreview() {
        const cells = this.playerGridElement.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('preview', 'invalid-preview');
        });
    }
    
    canPlaceShip(grid, row, col, size, horizontal) {
        for (let i = 0; i < size; i++) {
            const checkRow = horizontal ? row : row + i;
            const checkCol = horizontal ? col + i : col;
            
            if (checkRow < 0 || checkRow >= this.GRID_SIZE || 
                checkCol < 0 || checkCol >= this.GRID_SIZE || 
                grid[checkRow][checkCol] !== 0) {
                return false;
            }
        }
        return true;
    }
    
    placeShip(grid, row, col, size, horizontal) {
        for (let i = 0; i < size; i++) {
            const placeRow = horizontal ? row : row + i;
            const placeCol = horizontal ? col + i : col;
            grid[placeRow][placeCol] = 1;
        }
    }
    
    randomPlacement() {
        this.playerGrid = this.createEmptyGrid();
        this.playerShips = [];
        this.ships.forEach(ship => ship.placed = false);
        this.currentShipIndex = 0;
        
        for (let i = 0; i < this.ships.length; i++) {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 100) {
                const row = Math.floor(Math.random() * this.GRID_SIZE);
                const col = Math.floor(Math.random() * this.GRID_SIZE);
                const horizontal = Math.random() < 0.5;
                
                if (this.canPlaceShip(this.playerGrid, row, col, this.ships[i].size, horizontal)) {
                    this.placeShip(this.playerGrid, row, col, this.ships[i].size, horizontal);
                    this.playerShips.push({
                        ...this.ships[i],
                        row, col, horizontal,
                        hits: 0
                    });
                    this.ships[i].placed = true;
                    placed = true;
                }
                attempts++;
            }
        }
        
        this.currentShipIndex = this.ships.length;
        this.renderGrids();
        this.updateShipsToPlace();
        this.gameStatus.textContent = 'All ships placed! Ready to start battle.';
        this.startBtn.disabled = false;
        this.rotateBtn.disabled = true;
    }
    
    startGame() {
        this.gameStarted = true;
        this.placeAIShips();
        this.gameStatus.textContent = "Battle begins! Click on enemy waters to fire.";
        this.startBtn.disabled = true;
        this.randomBtn.disabled = true;
        this.renderGrids();
    }
    
    placeAIShips() {
        this.aiGrid = this.createEmptyGrid();
        this.aiShips = [];
        
        for (let i = 0; i < this.ships.length; i++) {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 100) {
                const row = Math.floor(Math.random() * this.GRID_SIZE);
                const col = Math.floor(Math.random() * this.GRID_SIZE);
                const horizontal = Math.random() < 0.5;
                
                if (this.canPlaceShip(this.aiGrid, row, col, this.ships[i].size, horizontal)) {
                    this.placeShip(this.aiGrid, row, col, this.ships[i].size, horizontal);
                    this.aiShips.push({
                        ...this.ships[i],
                        row, col, horizontal,
                        hits: 0
                    });
                    placed = true;
                }
                attempts++;
            }
        }
    }
    
    playerShoot(row, col) {
        this.shotsFired++;
        this.shotsFiredElement.textContent = this.shotsFired;
        
        if (this.aiGrid[row][col] === 1) {
            this.aiGrid[row][col] = 2;
            this.hits++;
            this.hitsElement.textContent = this.hits;
            
            const hitShip = this.aiShips.find(ship => this.isShipHit(ship, row, col));
            if (hitShip) {
                hitShip.hits++;
                if (hitShip.hits >= hitShip.size) {
                    this.sinkShip(this.aiGrid, hitShip);
                    this.shipsSunk++;
                    this.shipsSunkElement.textContent = this.shipsSunk;
                    this.gameStatus.textContent = `You sunk the enemy ${hitShip.name}!`;
                    
                    if (this.shipsSunk >= this.ships.length) {
                        this.endGame('player');
                        return;
                    }
                } else {
                    this.gameStatus.textContent = "Direct hit! Fire again!";
                }
            }
        } else {
            this.aiGrid[row][col] = 3;
            this.gameStatus.textContent = "Miss! AI's turn.";
            this.currentPlayer = 'ai';
            setTimeout(() => this.aiTurn(), 1000);
        }
        
        this.renderGrids();
    }
    
    aiTurn() {
        if (this.gameOver) return;
        
        let row, col;
        
        if (this.aiTargets.length > 0) {
            const target = this.aiTargets.shift();
            row = target.row;
            col = target.col;
        } else {
            ({ row, col } = this.getRandomTarget());
        }
        
        if (this.playerGrid[row][col] === 1) {
            this.playerGrid[row][col] = 2;
            this.aiLastHit = { row, col };
            
            this.aiHitHistory.push({ row, col });
            
            const hitShip = this.playerShips.find(ship => this.isShipHit(ship, row, col));
            if (hitShip) {
                hitShip.hits++;
                if (hitShip.hits >= hitShip.size) {
                    this.sinkShip(this.playerGrid, hitShip);
                    this.aiLastHit = null;
                    this.aiTargets = [];
                    this.aiHitHistory = [];
                    this.aiDetectedOrientation = null;
                    this.gameStatus.textContent = `AI sunk your ${hitShip.name}!`;
                    
                    if (this.playerShips.every(ship => ship.hits >= ship.size)) {
                        this.endGame('ai');
                        return;
                    }
                } else {
                    this.gameStatus.textContent = "AI hit your ship!";
                    this.addAdjacentTargets(row, col);
                }
            }
            
            setTimeout(() => this.aiTurn(), 1000);
        } else {
            this.playerGrid[row][col] = 3;
            this.gameStatus.textContent = "AI missed! Your turn.";
            this.currentPlayer = 'player';
        }
        
        this.renderGrids();
    }
    
    getRandomTarget() {
        let row, col;
        do {
            row = Math.floor(Math.random() * this.GRID_SIZE);
            col = Math.floor(Math.random() * this.GRID_SIZE);
        } while (this.playerGrid[row][col] === 2 || this.playerGrid[row][col] === 3 || this.playerGrid[row][col] === 4);
        
        return { row, col };
    }
    
    getAdjacentCells(row, col) {
        const adjacent = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        directions.forEach(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (newRow >= 0 && newRow < this.GRID_SIZE && 
                newCol >= 0 && newCol < this.GRID_SIZE) {
                adjacent.push({ row: newRow, col: newCol });
            }
        });
        
        return adjacent;
    }
    
    detectShipOrientation() {
        if (this.aiHitHistory.length < 2) return null;
        
        const lastTwoHits = this.aiHitHistory.slice(-2);
        const [hit1, hit2] = lastTwoHits;
        
        if (hit1.row === hit2.row && Math.abs(hit1.col - hit2.col) === 1) {
            return 'horizontal';
        }
        
        if (hit1.col === hit2.col && Math.abs(hit1.row - hit2.row) === 1) {
            return 'vertical';
        }
        
        return null;
    }
    
    getDirectionalTargets(row, col, orientation) {
        const targets = [];
        
        if (orientation === 'horizontal') {
            const directions = [[0, -1], [0, 1]];
            directions.forEach(([dRow, dCol]) => {
                const newRow = row + dRow;
                const newCol = col + dCol;
                
                if (newRow >= 0 && newRow < this.GRID_SIZE && 
                    newCol >= 0 && newCol < this.GRID_SIZE &&
                    this.playerGrid[newRow][newCol] !== 2 && 
                    this.playerGrid[newRow][newCol] !== 3 &&
                    this.playerGrid[newRow][newCol] !== 4) {
                    targets.push({ row: newRow, col: newCol });
                }
            });
        } else if (orientation === 'vertical') {
            const directions = [[-1, 0], [1, 0]];
            directions.forEach(([dRow, dCol]) => {
                const newRow = row + dRow;
                const newCol = col + dCol;
                
                if (newRow >= 0 && newRow < this.GRID_SIZE && 
                    newCol >= 0 && newCol < this.GRID_SIZE &&
                    this.playerGrid[newRow][newCol] !== 2 && 
                    this.playerGrid[newRow][newCol] !== 3 &&
                    this.playerGrid[newRow][newCol] !== 4) {
                    targets.push({ row: newRow, col: newCol });
                }
            });
        }
        
        return targets;
    }
    
    addAdjacentTargets(row, col) {
        this.aiDetectedOrientation = this.detectShipOrientation();
        
        let priorityTargets = [];
        let fallbackTargets = [];
        
        if (this.aiDetectedOrientation) {
            priorityTargets = this.getDirectionalTargets(row, col, this.aiDetectedOrientation);
            
            const allAdjacent = this.getAdjacentCells(row, col);
            fallbackTargets = allAdjacent.filter(cell => {
                const isDirectional = priorityTargets.some(target => 
                    target.row === cell.row && target.col === cell.col);
                return !isDirectional &&
                    this.playerGrid[cell.row][cell.col] !== 2 && 
                    this.playerGrid[cell.row][cell.col] !== 3 &&
                    this.playerGrid[cell.row][cell.col] !== 4;
            });
        } else {
            fallbackTargets = this.getAdjacentCells(row, col).filter(cell =>
                this.playerGrid[cell.row][cell.col] !== 2 && 
                this.playerGrid[cell.row][cell.col] !== 3 &&
                this.playerGrid[cell.row][cell.col] !== 4
            );
        }
        
        [...priorityTargets, ...fallbackTargets].forEach(cell => {
            if (!this.aiTargets.some(target => target.row === cell.row && target.col === cell.col)) {
                this.aiTargets.push(cell);
            }
        });
    }
    
    isShipHit(ship, row, col) {
        for (let i = 0; i < ship.size; i++) {
            const shipRow = ship.horizontal ? ship.row : ship.row + i;
            const shipCol = ship.horizontal ? ship.col + i : ship.col;
            
            if (shipRow === row && shipCol === col) {
                return true;
            }
        }
        return false;
    }
    
    sinkShip(grid, ship) {
        for (let i = 0; i < ship.size; i++) {
            const shipRow = ship.horizontal ? ship.row : ship.row + i;
            const shipCol = ship.horizontal ? ship.col + i : ship.col;
            grid[shipRow][shipCol] = 4;
        }
    }
    
    updateShipsToPlace() {
        const shipsToPlaceElement = document.getElementById('shipsToPlace');
        shipsToPlaceElement.innerHTML = '';
        
        this.ships.forEach(ship => {
            const shipDiv = document.createElement('div');
            shipDiv.className = `ship-info ${ship.placed ? 'placed' : ''}`;
            shipDiv.textContent = `${ship.name} (${ship.size})`;
            shipsToPlaceElement.appendChild(shipDiv);
        });
    }
    
    endGame(winner) {
        this.gameOver = true;
        this.currentPlayer = null;
        
        if (winner === 'player') {
            this.gameStatus.textContent = '🎉 Victory! You defeated the AI fleet!';
        } else {
            this.gameStatus.textContent = '💀 Defeat! The AI has sunk your fleet!';
        }
        
        this.renderGrids();
    }
    
    resetGame() {
        this.playerGrid = this.createEmptyGrid();
        this.aiGrid = this.createEmptyGrid();
        this.playerShips = [];
        this.aiShips = [];
        this.ships.forEach(ship => ship.placed = false);
        
        this.gameStarted = false;
        this.gameOver = false;
        this.currentPlayer = 'player';
        this.isHorizontal = true;
        this.currentShipIndex = 0;
        
        this.shotsFired = 0;
        this.hits = 0;
        this.shipsSunk = 0;
        
        this.aiLastHit = null;
        this.aiTargets = [];
        this.aiHitHistory = [];
        this.aiDetectedOrientation = null;
        
        this.gameStatus.textContent = 'Place your ships on the grid';
        this.startBtn.disabled = true;
        this.rotateBtn.disabled = false;
        this.randomBtn.disabled = false;
        this.rotateBtn.textContent = 'Rotate Ship';
        
        this.shotsFiredElement.textContent = '0';
        this.hitsElement.textContent = '0';
        this.shipsSunkElement.textContent = '0';
        
        this.renderGrids();
        this.updateShipsToPlace();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BattleshipGame();
});
