import * as enzyme from "enzyme";
import * as React from "react";

import { App } from "./App";
import { ChangeEvent, Inventory } from "./data/Inventory";

jest.mock("react-simple-tooltip", () => {
  return {
    default: "mock-tooltip",
  };
});

describe("<App />", () => {
  it("Renders the correct header", () => {
    const inventory = new Inventory() as any;

    const app = enzyme.shallow(<App inventory={inventory} />);
    expect(app.find("h1")).toMatchSnapshot();
  });

  it("Renders the correct footer", () => {
    const inventory = new Inventory() as any;

    const app = enzyme.shallow(<App inventory={inventory} />);
    expect(app.find("footer")).toMatchSnapshot();
  });

  it("Renders a logged in user", () => {
    const inventory = new Inventory() as any;
    inventory.user_ = {
      uid: "1234-5678",
      displayName: "Lennert Claeys",
      photoURL: "Photo url",
      admin: false,
    };

    const app = enzyme.shallow(<App inventory={inventory} />);

    if (inventory.changeListeners_.has(ChangeEvent.USER) === true) {
      inventory.changeListeners_
        .get(ChangeEvent.USER)!
        .forEach((listener: any) => listener.call(inventory, inventory.user_));
    }

    expect(app.find(".user-profile")).toMatchSnapshot();
    expect(app.find(".menu .right OptionIconButton button")).toMatchSnapshot();
  });

  it("Doesnt render a user", () => {
    const inventory = new Inventory() as any;
    inventory.user_ = null;

    const app = enzyme.shallow(<App inventory={inventory} />);

    if (inventory.changeListeners_.has(ChangeEvent.USER) === true) {
      inventory.changeListeners_
        .get(ChangeEvent.USER)!
        .forEach((listener: any) => listener.call(inventory, inventory.user_));
    }

    expect(app.find(".user-profile")).toHaveLength(0);
    expect(app.find(".menu .right OptionIconButton button")).toMatchSnapshot();
  });

  it("Renders a 404", () => {
    const inventory = new Inventory() as any;
    window.history.pushState({}, "404", "#/notfound/");

    const app = enzyme.mount(<App inventory={inventory} />);

    expect(app.find(".center")).toMatchSnapshot();
    app.unmount();
  });
});
