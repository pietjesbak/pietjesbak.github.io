import { blendColors } from './index.js';
import * as constants from './data/Constants.js';
import * as data from './data/BggData.js';
import React, { Component } from 'react';

class BggGame extends Component {
    constructor() {
        super();

        this.state = {
            error: false,
            expanded: false
        };
    }

    static defaultProps = {
        game: null
    }

    showFullDetails = async (e) => {
        e.preventDefault();

        let game = window.PIETJESBAK.games.get(Number(e.currentTarget.dataset.game));
        if (game.details !== undefined) {
            this.setState({ expanded: !this.state.expanded });
            return;
        }

        game.details = null;
        this.setState({ expanded: !this.state.expanded });
        try {
            let response = await fetch(constants.CORS_ANYWHERE_DYNO + constants.BBG_GAME_API + game.id);
            let xml = new DOMParser().parseFromString(await response.text(), 'text/xml');

            game.details = new data.BggDetailsData(xml.children[0].children[0]);
            this.setState(this.state);
        } catch (e) {
            console.error(e);
            game.details = undefined;
            this.setState({ error: true });
        }
    }

    renderDetails() {
        if (this.state.expanded === false) {
            return;
        }

        if (this.state.error === true) {
            return (
                <div className="full-details error">
                    <h2>Er is iets misgelopen!</h2>
                    <span>Je kan de pagina proberen herladen, stuur ons gerust een mailtje als het blijft gebeuren!</span>
                </div>
            );
        }

        if (this.props.game.details === null) {
            return (
                <div className="full-details">
                    <div className="spinner">
                        <i className="icon-spin1 animate-spin"></i>
                    </div>
                </div>
            );
        }

        return (
            <div className="full-details">
                <div className="warning">
                    <i className="icon-attention"></i>
                    Deze info wordt van <a target="blank" href={`https://www.boardgamegeek.com/boardgame/${this.props.game.id}/`}>boardgamegeek</a> gehaald en is dus in het Engels.
                </div>

                <h3><i className="icon-info"></i> Beschrijving</h3>
                <p className="description">{this.props.game.details.descriptionArray.map((part, i) => {
                    if (part.startsWith('http')) {
                        return <a key={i} href={part}>{part}</a>
                    }
                    return <span key={i} >{part}</span>
                })}</p>

                <dl>
                    <dt><i className="icon-tag"></i> Categorieën</dt>
                    <dd>
                        <ul className="tag-list">{this.props.game.details.categories.map(category => <li key={category}>{category}</li>)}</ul>
                    </dd>

                    <dt><i className="icon-cog"></i> Mechanics</dt>
                    <dd>
                        <ul className="tag-list">{this.props.game.details.mechanics.map(mechanic => <li key={mechanic}>{mechanic}</li>)}</ul>
                    </dd>

                    <dt><i className="icon-users"></i> Soort</dt>
                    <dd>
                        <ul className="tag-list">{this.props.game.details.domain.map(domain => <li key={domain}>{domain}</li>)}</ul>
                    </dd>

                    {this.renderFamily()}
                </dl>

                {this.renderExpansions()}
            </div>
        );
    }

    renderFamily() {
        if (this.props.game.details.family === undefined) {
            return;
        }

        return (
            <div>
                <dt><i className="icon-globe"></i> Thema</dt>
                <dd>
                    <ul className="tag-list">
                        <li>{this.props.game.details.family}</li>
                    </ul>
                </dd>
            </div>
        );
    }

    renderExpansions() {
        if (this.props.game.details.expansions.size === 0) {
            return;
        }

        return (
            <section>
                <h3><i className="icon-puzzle"></i> Uitbreidingen</h3>
                <ul className="tag-list">
                    {this.props.game.details.ownedExpansions.map(game => {
                        return (
                            <li key={game.id}>
                                <a target="blank" href={`https://www.boardgamegeek.com/boardgame/${game.id}/`}>
                                    <i className="icon-ok"></i>
                                    {game.name}
                                </a>
                            </li>
                        )
                    })}
                    {[...this.props.game.details.otherExpansions].map(([id, name]) => {
                        return (
                            <li key={id}>
                                <a target="blank" href={`https://www.boardgamegeek.com/boardgame/${id}/`}>
                                    <i className="icon-cancel"></i>
                                    {name}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </section>
        );
    }

    render() {
        return (
            <li key={this.props.game.id}>
                <span className="pointer" data-game={this.props.game.id} onClick={this.showFullDetails}>
                    <div className="thumb-holder">
                        <img src={this.props.game.thumbnail} alt={this.props.game.name}></img>
                    </div>
                    <div className="details">
                        <h3>{this.props.game.name}</h3>
                        <div>
                            <div className="info"><i className="icon-users"></i> {this.props.game.stats.players}</div>
                            <div className="info"><i className="icon-clock"></i> {this.props.game.stats.playtime}</div>
                        </div>
                        <div className="score" style={{ borderColor: blendColors('#FF0000', '#00FF00', this.props.game.stats.rating / 12) }}>{Math.round(this.props.game.stats.rating * 10) / 10}</div>
                    </div>
                </span>
                {this.renderDetails()}
            </li>
        );
    }
}

export default BggGame;
