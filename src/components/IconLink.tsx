import classNames from "classnames";
import * as React from "react";
import { NavLink } from "react-router-dom";
import Tooltip from "react-simple-tooltip";
import IconButton from "./IconButton";

class IconLink extends IconButton {
  renderBig() {
    return (
      <NavLink
        exact={true}
        className={classNames("button", this.props.subClass)}
        activeClassName="active"
        to={this.props.to!}
      >
        <i className={"icon-" + this.props.icon} /> {this.props.text}
      </NavLink>
    );
  }

  renderSmall() {
    return (
      <Tooltip content={this.props.text} placement={this.props.placement}>
        <NavLink
          exact={true}
          className={classNames("small-button", this.props.subClass)}
          activeClassName="active"
          to={this.props.to!}
        >
          <i className={"icon-" + this.props.icon} />
        </NavLink>
      </Tooltip>
    );
  }
}

export default IconLink;
