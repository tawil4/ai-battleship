// Main Battleship game class that handles all game logic and UI interactions
class BattleshipGame {
    // Initialize the game with default settings and setup
    constructor() {
        // Game board configuration
        this.GRID_SIZE = 10;
        
        // Define all ships with their names, sizes, and placement status
        this.ships = [
            { name: 'Carrier', size: 5, placed: false },
            { name: 'Battleship', size: 4, placed: false },
            { name: 'Cruiser', size: 3, placed: false },
            { name: 'Submarine', size: 3, placed: false },
            { name: 'Destroyer', size: 2, placed: false }
        ];
        
        // Create empty grids for player and AI (10x10 arrays filled with 0s)
        this.playerGrid = this.createEmptyGrid();
        this.aiGrid = this.createEmptyGrid();
        
        // Arrays to store placed ship objects with their positions
        this.playerShips = [];
        this.aiShips = [];
        
        // Game state flags
        this.gameStarted = false;  // True when battle begins
        this.gameOver = false;     // True when someone wins
        this.currentPlayer = 'player';  // Tracks whose turn it is
        this.isHorizontal = true;  // Ship orientation during placement
        this.currentShipIndex = 0; // Index of ship being placed
        
        // Player statistics tracking
        this.shotsFired = 0;  // Total shots player has taken
        this.hits = 0;        // Successful hits on AI ships
        this.shipsSunk = 0;   // Number of AI ships destroyed
        
        // AI targeting system for intelligent ship hunting
        this.aiLastHit = null;  // Last successful hit coordinates
        this.aiTargets = [];    // Queue of cells to target next
        this.aiHitHistory = []; // All successful AI hits on current ship
        this.aiDetectedOrientation = null;  // 'horizontal' or 'vertical' once detected
        
        // Initialize game UI and event handlers
        this.initializeDOM();
        this.setupEventListeners();
        this.renderGrids();
        this.updateShipsToPlace();
    }
    
    // Creates a 10x10 grid filled with zeros (0 = empty water)
    createEmptyGrid() {
        return Array(this.GRID_SIZE).fill().map(() => Array(this.GRID_SIZE).fill(0));
    }
    
    // Cache references to all DOM elements for performance
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
    
    // Attach click handlers to all game buttons
    setupEventListeners() {
        this.rotateBtn.addEventListener('click', () => {
            this.isHorizontal = !this.isHorizontal;
            this.rotateBtn.textContent = this.isHorizontal ? 'Rotate Ship' : 'Rotate Ship (Vertical)';
        });
        
        this.randomBtn.addEventListener('click', () => this.randomPlacement());
        this.startBtn.addEventListener('click', () => this.startGame());
        this.resetBtn.addEventListener('click', () => this.resetGame());
    }
    
    // Render both player and AI grids
    renderGrids() {
        this.renderGrid(this.playerGridElement, this.playerGrid, true);
        this.renderGrid(this.aiGridElement, this.aiGrid, false);
    }
    
    // Render a single grid with appropriate cell states and event listeners
    // Grid values: 0=empty, 1=ship, 2=hit, 3=miss, 4=sunk
    renderGrid(gridElement, grid, isPlayerGrid) {
        // Clear existing grid
        gridElement.innerHTML = '';
        
        // Create all 100 cells (10x10)
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                const cellValue = grid[row][col];
                
                // Apply visual styling based on cell state
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
                
                // Add appropriate event listeners based on game state
                if (isPlayerGrid && !this.gameStarted) {
                    // During setup: allow ship placement on player grid
                    cell.addEventListener('click', (e) => this.handlePlayerGridClick(e));
                    cell.addEventListener('mouseenter', (e) => this.showShipPreview(e));
                    cell.addEventListener('mouseleave', () => this.clearPreview());
                } else if (!isPlayerGrid && this.gameStarted && this.currentPlayer === 'player') {
                    // During battle: allow attacks on AI grid
                    cell.addEventListener('click', (e) => this.handleAIGridClick(e));
                }
                
                gridElement.appendChild(cell);
            }
        }
    }
    
    // Handle clicking on player grid during ship placement phase
    handlePlayerGridClick(e) {
        if (this.gameStarted || this.currentShipIndex >= this.ships.length) return;
        
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        
        // Check if ship can be placed at this location
        if (this.canPlaceShip(this.playerGrid, row, col, this.ships[this.currentShipIndex].size, this.isHorizontal)) {
            // Place the ship on the grid
            this.placeShip(this.playerGrid, row, col, this.ships[this.currentShipIndex].size, this.isHorizontal);
            
            // Store ship data for hit detection
            this.playerShips.push({
                ...this.ships[this.currentShipIndex],
                row, col,
                horizontal: this.isHorizontal,
                hits: 0,
                huntData: { hits: [], targets: [], orientation: null }
            });
            
            this.ships[this.currentShipIndex].placed = true;
            this.currentShipIndex++;
            
            // Update UI to show new ship
            this.renderGrids();
            this.updateShipsToPlace();
            
            // Check if all ships are placed
            if (this.currentShipIndex >= this.ships.length) {
                this.gameStatus.textContent = 'All ships placed! Ready to start battle.';
                this.startBtn.disabled = false;
                this.rotateBtn.disabled = true;
            }
        }
    }
    
    // Handle clicking on AI grid to attack during battle
    handleAIGridClick(e) {
        // Only allow attacks during player's turn
        if (this.currentPlayer !== 'player' || this.gameOver) return;
        
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        
        // Prevent attacking same cell twice (already hit or miss)
        if (this.aiGrid[row][col] === 2 || this.aiGrid[row][col] === 3) return;
        
        this.playerShoot(row, col);
    }
    
    // Show visual preview of ship placement on hover
    showShipPreview(e) {
        if (this.gameStarted || this.currentShipIndex >= this.ships.length) return;
        
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        const shipSize = this.ships[this.currentShipIndex].size;
        
        // Remove any existing preview
        this.clearPreview();
        
        // Determine if placement is valid (green) or invalid (red)
        const canPlace = this.canPlaceShip(this.playerGrid, row, col, shipSize, this.isHorizontal);
        const previewClass = canPlace ? 'preview' : 'invalid-preview';
        
        // Highlight all cells the ship would occupy
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
    
    // Remove all preview highlighting from player grid
    clearPreview() {
        const cells = this.playerGridElement.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('preview', 'invalid-preview');
        });
    }
    
    // Check if a ship can be legally placed at the given position
    // Returns false if out of bounds or overlapping another ship
    canPlaceShip(grid, row, col, size, horizontal) {
        // Check each cell the ship would occupy
        for (let i = 0; i < size; i++) {
            const checkRow = horizontal ? row : row + i;
            const checkCol = horizontal ? col + i : col;
            
            // Validate: within bounds and cell is empty (0)
            if (checkRow < 0 || checkRow >= this.GRID_SIZE || 
                checkCol < 0 || checkCol >= this.GRID_SIZE || 
                grid[checkRow][checkCol] !== 0) {
                return false;
            }
        }
        return true;
    }
    
    // Place a ship on the grid by marking cells with 1
    placeShip(grid, row, col, size, horizontal) {
        for (let i = 0; i < size; i++) {
            const placeRow = horizontal ? row : row + i;
            const placeCol = horizontal ? col + i : col;
            grid[placeRow][placeCol] = 1;
        }
    }
    
    // Automatically place all player ships randomly on the grid
    randomPlacement() {
        // Reset player grid and ship data
        this.playerGrid = this.createEmptyGrid();
        this.playerShips = [];
        this.ships.forEach(ship => ship.placed = false);
        this.currentShipIndex = 0;
        
        // Place each ship with random position and orientation
        for (let i = 0; i < this.ships.length; i++) {
            let placed = false;
            let attempts = 0;
            
            // Try up to 100 times to find valid placement
            while (!placed && attempts < 100) {
                const row = Math.floor(Math.random() * this.GRID_SIZE);
                const col = Math.floor(Math.random() * this.GRID_SIZE);
                const horizontal = Math.random() < 0.5;
                
                if (this.canPlaceShip(this.playerGrid, row, col, this.ships[i].size, horizontal)) {
                    this.placeShip(this.playerGrid, row, col, this.ships[i].size, horizontal);
                    this.playerShips.push({
                        ...this.ships[i],
                        row, col, horizontal,
                        hits: 0,
                        huntData: { hits: [], targets: [], orientation: null }
                    });
                    this.ships[i].placed = true;
                    placed = true;
                }
                attempts++;
            }
        }
        
        // Mark all ships as placed and enable start button
        this.currentShipIndex = this.ships.length;
        this.renderGrids();
        this.updateShipsToPlace();
        this.gameStatus.textContent = 'All ships placed! Ready to start battle.';
        this.startBtn.disabled = false;
        this.rotateBtn.disabled = true;
    }
    
    // Begin the battle phase after all ships are placed
    startGame() {
        this.gameStarted = true;
        this.placeAIShips();
        this.gameStatus.textContent = "Battle begins! Click on enemy waters to fire.";
        this.startBtn.disabled = true;
        this.randomBtn.disabled = true;
        this.renderGrids();
    }
    
    // Randomly place all AI ships on the AI grid
    placeAIShips() {
        this.aiGrid = this.createEmptyGrid();
        this.aiShips = [];
        
        // Place each AI ship randomly
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
                        hits: 0,
                        huntData: { hits: [], targets: [], orientation: null }
                    });
                    placed = true;
                }
                attempts++;
            }
        }
    }
    
    // Execute player's attack on AI grid at specified coordinates
    playerShoot(row, col) {
        // Update shot counter
        this.shotsFired++;
        this.shotsFiredElement.textContent = this.shotsFired;
        
        // Check if shot hit a ship (cell value is 1)
        if (this.aiGrid[row][col] === 1) {
            // Mark as hit (2) and update stats
            this.aiGrid[row][col] = 2;
            this.hits++;
            this.hitsElement.textContent = this.hits;
            
            // Find which ship was hit
            const hitShip = this.aiShips.find(ship => this.isShipHit(ship, row, col));
            if (hitShip) {
                hitShip.hits++;
                
                // Check if ship is completely destroyed
                if (hitShip.hits >= hitShip.size) {
                    this.sinkShip(this.aiGrid, hitShip);
                    this.shipsSunk++;
                    this.shipsSunkElement.textContent = this.shipsSunk;
                    this.gameStatus.textContent = `You sunk the enemy ${hitShip.name}!`;
                    
                    // Check for victory (all AI ships sunk)
                    if (this.shipsSunk >= this.ships.length) {
                        this.endGame('player');
                        return;
                    }
                } else {
                    this.gameStatus.textContent = "Direct hit! Fire again!";
                }
            }
        } else {
            // Shot missed - mark as miss (3) and switch to AI turn
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
        let targetShip = null;
        
        for (const ship of this.playerShips) {
            if (ship.huntData.targets.length > 0 && ship.hits < ship.size) {
                const target = ship.huntData.targets.shift();
                row = target.row;
                col = target.col;
                targetShip = ship;
                break;
            }
        }
        
        if (targetShip === null) {
            ({ row, col } = this.getRandomTarget());
        }
        
        // Check if AI hit a player ship
        if (this.playerGrid[row][col] === 1) {
            // Mark as hit and record for targeting algorithm
            this.playerGrid[row][col] = 2;
            
            const hitShip = this.playerShips.find(ship => this.isShipHit(ship, row, col));
            if (hitShip) {
                hitShip.hits++;
                hitShip.huntData.hits.push({ row, col });
                
                if (hitShip.hits >= hitShip.size) {
                    this.sinkShip(this.playerGrid, hitShip);
                    hitShip.huntData.targets = [];
                    hitShip.huntData.hits = [];
                    hitShip.huntData.orientation = null;
                    this.gameStatus.textContent = `AI sunk your ${hitShip.name}!`;
                    
                    // Check for AI victory
                    if (this.playerShips.every(ship => ship.hits >= ship.size)) {
                        this.endGame('ai');
                        return;
                    }
                } else {
                    // Ship damaged but not sunk - add adjacent cells to target queue
                    this.gameStatus.textContent = "AI hit your ship!";
                    this.addAdjacentTargets(hitShip, row, col);
                }
            }
            
            // AI gets another turn after a hit
            setTimeout(() => this.aiTurn(), 1000);
        } else {
            // AI missed - mark cell and switch to player turn
            this.playerGrid[row][col] = 3;
            this.gameStatus.textContent = "AI missed! Your turn.";
            this.currentPlayer = 'player';
        }
        
        this.renderGrids();
    }
    
    // Get random untargeted cell for AI to attack
    getRandomTarget() {
        let row, col;
        
        // Keep generating random coordinates until finding an untargeted cell
        do {
            row = Math.floor(Math.random() * this.GRID_SIZE);
            col = Math.floor(Math.random() * this.GRID_SIZE);
        } while (this.playerGrid[row][col] === 2 || this.playerGrid[row][col] === 3 || this.playerGrid[row][col] === 4);
        
        return { row, col };
    }
    
    getAdjacentCells(row, col) {
        const adjacent = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }
        
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
    
    detectShipOrientation(ship) {
        if (ship.huntData.hits.length < 2) return null;
        
        const lastTwoHits = ship.huntData.hits.slice(-2);
        const [hit1, hit2] = lastTwoHits;
        
        // Same row and adjacent columns = horizontal
        if (hit1.row === hit2.row && Math.abs(hit1.col - hit2.col) === 1) {
            return 'horizontal';
        }
        
        // Same column and adjacent rows = vertical
        if (hit1.col === hit2.col && Math.abs(hit1.row - hit2.row) === 1) {
            return 'vertical';
        }
        
        // Hits not adjacent or diagonal
        return null;
    }
    
    // Get cells in line with detected ship orientation for focused targeting
    getDirectionalTargets(row, col, orientation) {
        const targets = [];
        
        // For horizontal ships, target left and right
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
            // For vertical ships, target up and down
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
    
    addAdjacentTargets(ship, row, col) {
        ship.huntData.orientation = this.detectShipOrientation(ship);
        
        let priorityTargets = [];
        let fallbackTargets = [];
        
        if (ship.huntData.orientation) {
            priorityTargets = this.getDirectionalTargets(row, col, ship.huntData.orientation);
            
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
            if (!ship.huntData.targets.some(target => target.row === cell.row && target.col === cell.col)) {
                ship.huntData.targets.push(cell);
            }
        });
    }
    
    // Check if given coordinates hit a specific ship
    isShipHit(ship, row, col) {
        // Check each cell occupied by the ship
        for (let i = 0; i < ship.size; i++) {
            const shipRow = ship.horizontal ? ship.row : ship.row + i;
            const shipCol = ship.horizontal ? ship.col + i : ship.col;
            
            if (shipRow === row && shipCol === col) {
                return true;
            }
        }
        return false;
    }
    
    // Mark all cells of a sunk ship with value 4 (sunk state)
    sinkShip(grid, ship) {
        for (let i = 0; i < ship.size; i++) {
            const shipRow = ship.horizontal ? ship.row : ship.row + i;
            const shipCol = ship.horizontal ? ship.col + i : ship.col;
            grid[shipRow][shipCol] = 4;
        }
    }
    
    // Update the ship placement UI list showing which ships are placed
    updateShipsToPlace() {
        const shipsToPlaceElement = document.getElementById('shipsToPlace');
        shipsToPlaceElement.innerHTML = '';
        
        // Create list item for each ship
        this.ships.forEach(ship => {
            const shipDiv = document.createElement('div');
            shipDiv.className = `ship-info ${ship.placed ? 'placed' : ''}`;
            shipDiv.textContent = `${ship.name} (${ship.size})`;
            shipsToPlaceElement.appendChild(shipDiv);
        });
    }
    
    // End the game and display winner
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
    
    // Reset entire game to initial state for new game
    resetGame() {
        // Clear all grids and ship data
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
        
        this.gameStatus.textContent = 'Place your ships on the grid';
        this.startBtn.disabled = true;
        this.rotateBtn.disabled = false;
        this.randomBtn.disabled = false;
        this.rotateBtn.textContent = 'Rotate Ship';
        
        // Reset stat displays
        this.shotsFiredElement.textContent = '0';
        this.hitsElement.textContent = '0';
        this.shipsSunkElement.textContent = '0';
        
        this.renderGrids();
        this.updateShipsToPlace();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new BattleshipGame();
});
