import { ICONBUTTON_MIN_SCREEN_WIDTH } from './data/Constants.js';
import { NavLink  } from 'react-router-dom';
import IconButton from './IconButton.js';
import React from 'react';
import Tooltip from 'react-simple-tooltip';

class IconLink extends IconButton {
    render() {
        if (this.state.windowWidth <= ICONBUTTON_MIN_SCREEN_WIDTH) {
            return (
                <Tooltip content={this.props.text} placement={this.props.placement}>
                    <NavLink exact className={"small-button " + (this.props.subClass || "")} activeClassName="active" to={this.props.to}>
                        <i className={"icon-" + this.props.icon}></i>
                    </NavLink >
                </Tooltip>
            );
        } else {
            return (
                <NavLink exact className={"button " + (this.props.subClass || "")} activeClassName="active" to={this.props.to}>
                    <i className={"icon-" + this.props.icon}></i> {this.props.text}
                </NavLink >
            );
        }
    }
}

export default IconLink;
