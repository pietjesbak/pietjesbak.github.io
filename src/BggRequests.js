import './css/Games.css';
import { Link } from 'react-router-dom'
import * as constants from './data/Constants.js';
import BggGame from './BggGame.js';
import inventory from './data/Inventory.js';
import React, { Component } from 'react';

class BggRequests extends Component {
    constructor() {
        super();

        this.state = {
            requestedGames: null
        }

        // Make sure the dyno is running.
        fetch(constants.CORS_ANYWHERE_DYNO);
    }

    componentDidMount() {
        inventory.addChangeListener(this.updateGames);
    }

    componentWillUnmount() {
        inventory.removeChangeListener(this.updateGames);
    }

    updateGames = (games) => {
        const requestedGames = [...games.values()].filter(game => game.requestsThisMonth > 0);
        this.setState({ requestedGames });
    }

    render() {
        if (this.state.requestedGames === null) {
            return (
                <div className="bgg-requests card">
                    <h3>Aanvragen deze maand</h3>
                    <div className="spinner">
                        <i className="icon-spin1 animate-spin"></i>
                    </div>
                </div>
            );
        }

        if (this.state.requestedGames.length === 0) {
            return (
                <div className="bgg-requests card">
                    <h3>Aanvragen deze maand</h3>
                    <p>
                        Er zijn nog geen aanvragen. <br />
                        Geef aan welk spel je volgende keer graag wil spelen op de <Link to="/games">games</Link> pagina!
                    </p>
                </div>
            );
        }

        return (
            <div className="bgg-requests card">
                <h3>Aanvragen deze maand</h3>
                <ul className="games">{this.state.requestedGames.map(game => <BggGame key={game.id} game={game}></BggGame>)}</ul>
            </div>
        );
    }
}

export default BggRequests;
