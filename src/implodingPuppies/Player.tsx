import classNames from 'classnames';
import * as React from 'react';
// import Card from './Card';
// import { cards, CardTypes } from './data/Cards';
import { Player as PlayerData } from './data/Player';

export interface Callbacks {
    onPlay: () => void;
    onDraw: () => void;
    onNope: () => void;
}

interface Props {
    player: PlayerData;
    interactive?: Callbacks;
    canNope?: boolean;
    active?: boolean;
}

class Player extends React.Component<Props & React.ClassAttributes<Player>> {
    constructor(props: Props & React.ClassAttributes<Player>) {
        super(props);
    }

    // getCardStyles(index: number) {
    //     const count = this.props.player.cards.length - 1;
    //     const range = Math.sqrt(count / 2) * 36;

    //     return {
    //         transform: `translateX(${(-count / 2 + index) * 10}px) rotate(${(-count / 2 + index) * range / count}deg)`
    //     };
    // }

    clickCard = (index: number) => (e: React.MouseEvent<HTMLDivElement>) => {
        // this.setState(state => {
        //     const selection = [...state.selection];
        //     const pos = selection.indexOf(index);

        //     if (pos === -1) {
        //         if (cards.get(this.props.player.cards[index])!.playTest(this.props.player, this.selection)) {
        //             selection.push(index);
        //         }
        //     } else {
        //         selection.splice(pos, 1);
        //     }

        //     return { selection };
        // });
    }

    clickButton = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (this.props.player.selection.length === 0) {
            this.props.interactive!.onDraw();
        } else {
            this.props.interactive!.onPlay();
        }
    }

    render() {
        return (
            <div className={classNames('imploding-puppies-player', { 'interactive': this.props.interactive }, { 'active': this.props.active })}>
                <button onClick={this.clickButton}>{this.props.player.selection.length === 0 ? 'Draw' : 'Play'}</button>

                {/* {this.props.interactive ? (
                    <>
                        {this.props.player.cards.map((type, i) => <Card
                            style={this.getCardStyles(i)}
                            canSelect={cards.get(type)!.playTest(this.props.player, this.selection)}
                            selected={this.state.selection.indexOf(i) !== -1}
                            onClick={this.clickCard(i)}
                            type={type}
                            key={i}
                        />)}
                        <span className="card-count">{this.props.player.cards.length}</span>
                        {this.props.canNope && this.props.player.find(CardTypes.NOPE) ? <button className="nope" onClick={this.props.interactive.onNope}>Nope!</button> : <button onClick={this.clickButton}>{this.state.selection.length === 0 ? 'Draw' : 'Play'}</button>}
                    </>
                ) : (
                        this.props.player.cards.map((type, i) => <Card
                            style={this.getCardStyles(i)}
                            selected={this.state.selection.indexOf(i) !== -1}
                            key={i}
                        />)
                    )} */}
            </div>
        );
    }
}

export default Player;
