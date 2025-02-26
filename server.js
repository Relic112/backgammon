const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3100 });
let players = [];
let board = Array.from({ length: 15 }, () => Array(15).fill(null));
// 处理新连接的玩家
function handleNewConnection(ws) {
    if (players.length === 0) {
        players.push(ws);
        //sendMessage(ws, { color: 'black' });
        console.log('玩家 1 已连接，分配黑色棋子，等待对方连接');
    } else if (players.length === 1) {
        players.push(ws);
        sendMessage(players[0], {color:'black', player:1,message: '对方已连接，开始游戏，你的回合' });
        sendMessage(ws, { color: 'white',player:2, message: '对方已连接，等待对方落子' });
        console.log('玩家 2 已连接，分配白色棋子，游戏开始');
    } else {
        sendMessage(ws, { message: '房间已满，无法加入' });
        ws.close();
        console.log('有玩家尝试加入，但房间已满');
    }
}

// 发送消息给指定的 WebSocket 连接
function sendMessage(ws, data) {
    try {
        ws.send(JSON.stringify(data));
    } catch (error) {
        console.error('发送消息时出错:', error);
    }
}

// 检查是否有玩家获胜
function checkWin(x, y, color) {
    const directions = [
        [1, 0], [0, 1], [1, 1], [1, -1]
    ];

    for (const [dx, dy] of directions) {
        let count = 1;

        // 正向检查
        for (let i = 1; i < 5; i++) {
            const newX = x + i * dx;
            const newY = y + i * dy;
            if (newX >= 0 && newX < 15 && newY >= 0 && newY < 15 && board[newX][newY] === color) {
                count++;
            } else {
                break;
            }
        }

        // 反向检查
        for (let i = 1; i < 5; i++) {
            const newX = x - i * dx;
            const newY = y - i * dy;
            if (newX >= 0 && newX < 15 && newY >= 0 && newY < 15 && board[newX][newY] === color) {
                count++;
            } else {
                break;
            }
        }

        if (count >= 5) {
            return true;
        }
    }

    return false;
}

// 处理接收到的消息
function handleMessage(ws, message) {
    try {
        const msg = JSON.parse(message);
        if (msg.move) {
            const opponent = players.find(p => p !== ws);
            if (opponent) {
                sendMessage(opponent, { move: msg.move });
                console.log('Received move message, forwarding to opponent');
                // Validate row and col
                const x = msg.move.row;
                const y = msg.move.col;
                if (typeof x === 'number' && typeof y === 'number' && x >= 0 && x < 15 && y >= 0 && y < 15) {
                    const playerIndex = players.indexOf(ws);
                    const color = playerIndex === 0 ? 'black' : 'white';
                    board[x][y] = color;
                    // Check if the player has won
                    if (checkWin(x, y, color)){
                        sendMessage(ws, { message: 'You won!', end: 1 });
                        sendMessage(opponent, { message: 'You lost!', end: 1 });
                        // Reset the board
                        board = Array.from({ length: 15 }, () => Array(15).fill(null));
                        // Disconnect players
                        players = [];
                    }
                } else {
                    console.error('Invalid move coordinates:', x, y);
                }
            }
        }
    } catch (error) {
        console.error('Error parsing message:', error);
    }
}

// 处理连接关闭事件
function handleClose(ws) {
    players = players.filter(p => p !== ws);
    if (players.length > 0) {
        sendMessage(players[0], { message: '对方已断开连接，等待新玩家加入' });
        console.log('有玩家断开连接，通知剩余玩家等待新玩家加入');
    }
}

wss.on('connection', (ws) => {
    handleNewConnection(ws);

    ws.on('message', (message) => {
        handleMessage(ws, message);
    });

    ws.on('close', () => {
        handleClose(ws);
    });
});

console.log('WebSocket 服务器已启动，监听端口 3100');