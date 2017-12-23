import { ICONBUTTON_MIN_SCREEN_WIDTH } from './data/Constants.js';
import React, { Component } from 'react';
import Tooltip from 'react-simple-tooltip';

class IconButton extends Component {
    constructor(props) {
        super(props);

        this.state = {
            windowWidth: window.innerWidth
        };
    }

    handleResize = (e) => {
        this.setState({
            windowWidth: window.innerWidth
        });
    }

    componentDidMount() {
        window.addEventListener('resize', this.handleResize)
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize)
    }

    render() {
        if (this.state.windowWidth <= ICONBUTTON_MIN_SCREEN_WIDTH) {
            return (
                <Tooltip content={this.props.text} placement={this.props.placement}>
                    <button className={"small-button " + this.props.subClass} onClick={this.props.action}>
                        <i className={"icon-" + this.props.icon}></i>
                    </button>
                </Tooltip>
            );
        } else {
            return (
                <button className={"button " + this.props.subClass} onClick={this.props.action}>
                    <i className={"icon-" + this.props.icon}></i> {this.props.text}
                </button>
            );
        }
    }
}

export default IconButton;
