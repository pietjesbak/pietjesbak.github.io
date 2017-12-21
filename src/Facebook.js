import './css/Facebook.css';
import React, { Component } from 'react';
import { FACEBOOK_PIETJESBAK_EVENTS } from './data/Constants.js'

class Facebook extends Component {
    constructor() {
        super();
        this.state = {
            events: null,
            error: false
        };

        fetch(FACEBOOK_PIETJESBAK_EVENTS)
            .then(response => {
                if (response.ok === false) {
                    throw Error("Incorrect response");
                }

                return response;
            })
            .then(response => response.json())
            .then(json => {
                this.setState({
                    events: json.data
                });
            })
            .catch(() => {
                this.setState({
                    error: true
                });
            });
    }

    renderDate(date) {
        let readableDate = date.toLocaleString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        });

        if (Date.now() - date < 0) {
            return <div className="date valid">
                <span>Op {readableDate}</span>
            </div>
        }

        if (Date.now() - date < 1000 * 60 * 60 * 5) {
            return <div className="date ongoing">
                <span>Op {readableDate}</span><br />
                <span><strong>Nu aan de gang!</strong></span>
            </div>
        }

        return <div className="date expired">
            <span>Op {readableDate}</span><br />
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
