import * as React from 'react';
import { NavLink  } from 'react-router-dom';
import Tooltip from 'react-simple-tooltip';
import { ICONBUTTON_MIN_SCREEN_WIDTH } from './data/Constants';
import IconButton, { IconButtonBehavour } from './IconButton';

class IconLink extends IconButton {
    render() {
        if ((this.state.windowWidth <= ICONBUTTON_MIN_SCREEN_WIDTH || this.props.behaviour === IconButtonBehavour.SMALL) && this.props.behaviour !== IconButtonBehavour.BIG) {
            return (
                <Tooltip content={this.props.text} placement={this.props.placement}>
                    <NavLink exact={true} className={"small-button " + (this.props.subClass || "")} activeClassName="active" to={this.props.to!}>
                        <i className={"icon-" + this.props.icon} />
                    </NavLink >
                </Tooltip>
            );
        } else {
            return (
                <NavLink exact={true} className={"button " + (this.props.subClass || "")} activeClassName="active" to={this.props.to!}>
                    <i className={"icon-" + this.props.icon} /> {this.props.text}
                </NavLink >
            );
        }
    }
}

export default IconLink;
