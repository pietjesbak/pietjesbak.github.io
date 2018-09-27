import { CardTypes } from './Cards';
import { Player } from './Player';
import { Server } from './Server';

function startServer(server: Server, players: Player[], count: number = 3) {
    for (let i = 0; i < count; i++) {
        players[i] = new Player([], i);
        server.join(players[i]);
    }

    server.forceStart();
}

describe('Server', () => {
    it('Works when 5 players join the server', (callback) => {
        const server = new Server();
        server.waitForPlayers().then(players => callback());

        Promise.resolve().then(() => {
            for (let i = 0; i < 5; i++) {
                server.join(new Player([], i));
            }
        });
    });

    it('Works when force start is called with less than 5 players.', (callback) => {
        const server = new Server();
        server.waitForPlayers().then(players => callback());

        Promise.resolve().then(() => {
            for (let i = 0; i < 3; i++) {
                server.join(new Player([], i));
            }

            server.forceStart();
        });
    });

    it('A player can draw a card', (callback) => {
        const server = new Server();
        const players: Player[] = [];

        Server.prototype.nextTurn = jest.fn(() => true);
        Server.prototype.playerDraw = jest.fn();
        Server.prototype.playerPlay = jest.fn();
        Player.prototype.giveOptions = jest.fn((drawFn: () => void) => drawFn());

        Promise.resolve().then(() => {
            server.gameLoop().then(() => {
                expect(server.playerDraw).toBeCalled();
                expect(server.playerPlay).not.toBeCalled();
                expect(server.nextTurn).toBeCalled();

                callback();
            });

            startServer(server, players);
        });
    });

    it('A player can play one or more cards', (callback) => {
        const server = new Server();
        const players: Player[] = [];

        let turn = 0;

        Server.prototype.nextTurn = jest.fn(() => turn > 1);
        Server.prototype.playerDraw = jest.fn();
        Server.prototype.playerPlay = jest.fn();
        Player.prototype.giveOptions = jest.fn((drawFn: () => void, playFn: (selection: CardTypes[]) => void) => {
            if (turn === 0) {
                playFn([CardTypes.ATTACK]);
            } else {
                playFn([CardTypes.PUPPY_1, CardTypes.PUPPY_1]);
            }
            turn++;
        });

        Promise.resolve().then(() => {
            server.gameLoop().then(() => {
                expect(server.playerDraw).not.toBeCalled();
                expect(server.playerPlay).toHaveBeenCalledTimes(2);
                expect(server.playerPlay).toBeCalledWith([CardTypes.ATTACK]);
                expect(server.playerPlay).toBeCalledWith([CardTypes.PUPPY_1, CardTypes.PUPPY_1]);
                expect(server.nextTurn).toBeCalled();

                callback();
            });

            startServer(server, players);
        });
    });

    it('A played card can be noped', (callback) => {
        const server = new Server();
        const players: Player[] = [];

        // let complete = false;

        Server.prototype.nextTurn = jest.fn(() => true);
        Server.prototype.playerDraw = jest.fn();
        Server.prototype.playerPlay = jest.fn();
        Player.prototype.giveOptions = jest.fn((drawFn: () => void, playFn: (selection: CardTypes[]) => void) => {
            playFn([CardTypes.ATTACK]);
        });
        Player.prototype.allowNope = jest.fn((nopeFn: () => void) => {
            // complete = true;
            nopeFn();
        });

        Promise.resolve().then(() => {
            server.gameLoop().then(() => {
                expect(server.nextTurn).toBeCalled();

                callback();
            });

            startServer(server, players);
        });
    });
});
