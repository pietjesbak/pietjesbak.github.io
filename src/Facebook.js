import './css/Facebook.css';
import { readableDate } from './index';
import inventory from './data/Inventory';
import React, { Component } from 'react';

class Facebook extends Component {
    constructor() {
        super();
        this.state = {
            events: null,
            error: false
        };
    }

    async componentDidMount() {
        try {
            const events = await inventory.getFacebookEvent();
            this.setState({ events: events });
        } catch (e) {
            console.error(e);
            this.setState({ error: true });
        }
    }

    renderDate(date) {
        let readable = readableDate(date, true);

        if (Date.now() - date < 0) {
            return <div className="date valid">
                <span>Op {readable}</span>
            </div>
        }

        if (Date.now() - date < 1000 * 60 * 60 * 5) {
            return <div className="date ongoing">
                <span>Op {readable}</span><br />
                <span><strong>Nu aan de gang!</strong></span>
            </div>
        }

        return <div className="date expired">
            <span>Op {readable}</span><br />
            <span>Dit event is voorbij, nieuwe events worden meestal 2 weken op voorhand geplant.</span>
        </div>
    }

    renderEvent(events, error) {
        if (error === true) {
            return <h2>De facebook API lijkt geblokkeerd...</h2>
        }

        if (events === null) {
            return <h2>Events van Facebook ophalen...</h2>
        }

        if (events.length === 0) {
            return <h2>Er lijkt momenteel geen volgend event gepland te zijn.</h2>
        }

        let event = events[0];
        let date = new Date(event.start_time);
        return <div>
            <h2>{event.name}</h2>
            {this.renderDate(date)}
            <br />

            {event.description.split('\n').map((item, key) => {
                return <span key={key}>{item}<br /></span>
            })}
        </div>
    }

    render() {
        return <div className={this.state.error ? "facebook-card card error" : "facebook-card card"}>
            <a className="facebook" href="https://www.facebook.com/gezelschapsspellenpietjesbak/" ><i className="icon-facebook-squared"></i></a>

            {this.renderEvent(this.state.events, this.state.error)}
        </div>
    }
}


export default Facebook;
