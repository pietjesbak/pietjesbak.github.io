import './css/Games.css';

import * as React from 'react';
import { Link } from 'react-router-dom'
import { readableDate } from '.';
import BggGame from './BggGame';
import { Container } from './components/Container';
import { TextPlaceholder } from './components/TextPlaceholder';
import { BggGameData } from './data/BggData';
import * as constants from './data/Constants';
import inventory, { ChangeEvent } from './data/Inventory';

export interface State {
    requestedGames: BggGameData[] | null;
    nextEvent: { date: Date, confirmed: boolean } | null;
}

export default class BggRequests extends React.Component<React.HtmlHTMLAttributes<BggRequests>, State> {
    constructor(props: React.HtmlHTMLAttributes<BggRequests>) {
        super(props);

        this.state = {
            requestedGames: null,
            nextEvent: null
        }

        // Make sure the dyno is running.
        fetch(constants.CORS_ANYWHERE_DYNO);
    }

    async componentDidMount() {
        inventory.addChangeListener(ChangeEvent.GAME_DATA, this.updateGames);

        this.setState({ nextEvent: await inventory.getNextEventDate() });
    }

    componentWillUnmount() {
        inventory.removeChangeListener(ChangeEvent.GAME_DATA, this.updateGames);
    }

    updateGames = (games: Map<number, BggGameData>) => {
        const requestedGames = [...games.values()].filter(game => game.requestsThisMonth > 0).sort((a, b) => b.requestsThisMonth - a.requestsThisMonth || b.stats.rating - a.stats.rating);
        this.setState({ requestedGames });
    }

    render() {
        let date = <span>de volgende keer</span>;

        if (this.state.nextEvent !== null) {
            date = <span>{readableDate(this.state.nextEvent.date, false)} <span className="mute"> {this.state.nextEvent.confirmed ? "" : "(nog niet vastgelegd)"}</span></span>
        }

        if (this.state.requestedGames === null) {
            return (
                <Container>
                    <h3>Aanvragen voor {date}</h3>
                    <TextPlaceholder renderTitle={false} paragraphSize={4}/>
                </Container>
            );
        }

        if (this.state.requestedGames.length === 0) {
            return (
                <Container>
                    <h3>Aanvragen voor {date}</h3>
                    <p>
                        Er zijn nog geen aanvragen. <br />
                        Geef aan welk spel je volgende keer graag wil spelen op de <Link to="/games">games</Link> pagina! <br /><br />
                        Of neem gerust enkele van je eigen spellen mee.
                    </p>
                </Container>
            );
        }

        return (
            <Container>
                <h3>Aanvragen voor {date}</h3>
                <ul className="games">{this.state.requestedGames.map(game => <BggGame key={game.id} game={game} />)}</ul>
            </Container>
        );
    }
}
