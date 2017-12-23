import './css/Games.css';
import { Link } from 'react-router-dom'
import { readableDate } from './index';
import * as constants from './data/Constants.js';
import BggGame from './BggGame.js';
import inventory from './data/Inventory.js';
import React, { Component } from 'react';

class BggRequests extends Component {
    constructor() {
        super();

        this.state = {
            requestedGames: null,
            nextEvent: null
        }

        // Make sure the dyno is running.
        fetch(constants.CORS_ANYWHERE_DYNO);
    }

    async componentDidMount() {
        inventory.addChangeListener(this.updateGames);

        this.setState({ nextEvent: await inventory.getNextEventDate() });
    }

    componentWillUnmount() {
        inventory.removeChangeListener(this.updateGames);
    }

    updateGames = (games) => {
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
                <div className="bgg-requests card">
                    <h3>Aanvragen voor {date}</h3>
                    <div className="spinner">
                        <i className="icon-spin1 animate-spin"></i>
                    </div>
                </div>
            );
        }

        if (this.state.requestedGames.length === 0) {
            return (
                <div className="bgg-requests card">
                    <h3>Aanvragen voor {date}</h3>
                    <p>
                        Er zijn nog geen aanvragen. <br />
                        Geef aan welk spel je volgende keer graag wil spelen op de <Link to="/games">games</Link> pagina! <br />
                        Of neem gerust enkele van je eigen spellen mee.
                    </p>
                </div>
            );
        }

        return (
            <div className="bgg-requests card">
                <h3>Aanvragen voor {date}</h3>
                <ul className="games">{this.state.requestedGames.map(game => <BggGame key={game.id} game={game}></BggGame>)}</ul>
            </div>
        );
    }
}

export default BggRequests;
