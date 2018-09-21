import './css/Game.css';

import * as React from 'react';
import { Card } from './Card';
import { Game as GameData } from './data/Game';

interface Props {
    playerCount: number;
}

interface State {
    game: GameData;
}

class Game extends React.Component<Props & React.ClassAttributes<Game>, State> {
    constructor(props: Props & React.ClassAttributes<Game>) {
        super(props);

        this.state = {
            game: new GameData(props.playerCount)
        }
    }

    render() {
        return (
            <div className="imploding-puppies-game">
                {this.state.game.deck.cards.map((type, i) => <Card key={i} type={type} />)}
            </div>
        );
    }
}

export default Game;
