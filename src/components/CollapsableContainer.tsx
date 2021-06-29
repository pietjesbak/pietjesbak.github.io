import classNames from "classnames";
import * as React from "react";
import { Container } from "./Container";

export interface State {
  collapsed: boolean;
}

export enum headerState {
  /**
   * The header is always shown. (default)
   */
  SHOWN,

  /**
   * The header is shown when hovering inside the container.
   */
  SHOWN_ON_HOVER,

  /**
   * The header is shown when hovering inside the container and always shown when collapsed.
   */
  SHOWN_COLLAPSED,
}

export interface Props extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Is the container open or closed by default.
   * Default open.
   */
  defaultCollapsed?: boolean;

  /**
   * An optional title to show when the container is closed.
   */
  title?: string;

  /**
   * How should the header behave?
   * Default shown.
   */
  header?: headerState;

  /**
   * Does the container contain an error? Affects the colors.
   * Note: this prop is just passed through to the child container.
   */
  error?: boolean;

  /**
   * Store the collapsed state in localstorage? Default false
   * A title is required to store the state.
   */
  storeCollapsed?: boolean;
}

export class CollapsableContainer extends React.Component<Props, State> {
  static defaultProps = {
    header: headerState.SHOWN,
  };

  constructor(props: Props) {
    super(props);

    let collapsed: boolean | null = null;
    if (props.storeCollapsed && props.title) {
      const stored = localStorage.getItem(encodeURIComponent(props.title));
      if (stored !== null) {
        collapsed = stored === "true";
      }
    }
    if (collapsed === null) {
      collapsed = props.defaultCollapsed || false;
    }

    this.state = {
      collapsed,
    };
  }

  toggle = () => {
    const newState = !this.state.collapsed;
    this.setState({
      collapsed: newState,
    });

    if (this.props.storeCollapsed && this.props.title) {
      localStorage.setItem(
        encodeURIComponent(this.props.title),
        String(newState)
      );
    }
  };

  render(): JSX.Element {
    return this.state.collapsed
      ? this.renderCollapsed()
      : this.renderExpanded();
  }

  renderCollapsed() {
    const { children, className, title, header, storeCollapsed, ...rest } =
      this.props;
    return (
      <Container className={classNames(className, "collapsable")} {...rest}>
        <h3
          className={classNames("collapsed-header", {
            hover: header === headerState.SHOWN_ON_HOVER,
          })}
          onClick={this.toggle}
        >
          <i className="container-button icon-window-maximize" />
          <span>{title}</span>
        </h3>
      </Container>
    );
  }

  renderExpanded() {
    const { children, className, title, header, storeCollapsed, ...rest } =
      this.props;

    return (
      <Container className={classNames(className, "collapsable")} {...rest}>
        <h3
          className={classNames("collapsed-header", {
            hover:
              header === headerState.SHOWN_ON_HOVER ||
              header === headerState.SHOWN_COLLAPSED,
          })}
          onClick={this.toggle}
        >
          <i className="container-button icon-window-minimize" />
          <span>{title}</span>
        </h3>
        <div className="content">{children}</div>
      </Container>
    );
  }
}
