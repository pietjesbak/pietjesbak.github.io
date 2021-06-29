import * as enzyme from "enzyme";
import * as React from "react";

import { IconButtonBehavour } from "./IconButton";
import IconLink from "./IconLink";

jest.mock("react-simple-tooltip", () => {
  return {
    default: "mock-tooltip",
  };
});

jest.mock("react-router-dom", () => {
  return {
    NavLink: "mock-navlink",
  };
});

describe("<IconLink />", () => {
  it("Renders a big button", () => {
    const button = enzyme.shallow(<IconLink icon="globe" text="Home" to="/" />);

    expect(button).toMatchSnapshot("big button");
  });

  it("Renders a small button", () => {
    (window as any).innerWidth = 500;

    const button = enzyme.mount(<IconLink icon="globe" text="Home" to="/" />);

    expect(button).toMatchSnapshot("small button");
  });

  it("Renders a big button regardless of screen size", () => {
    (window as any).innerWidth = 500;

    const button = enzyme.shallow(
      <IconLink
        icon="globe"
        text="Home"
        to="/"
        behaviour={IconButtonBehavour.BIG}
      />
    );

    expect(button).toMatchSnapshot("big button");
  });

  it("Renders a small button regardless of screen size", () => {
    (window as any).innerWidth = 1920;

    const button = enzyme.shallow(
      <IconLink
        icon="globe"
        text="Home"
        to="/"
        behaviour={IconButtonBehavour.SMALL}
      />
    );

    expect(button).toMatchSnapshot("small button");
  });
});
