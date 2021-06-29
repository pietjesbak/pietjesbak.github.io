import * as enzyme from "enzyme";
import * as React from "react";

import { CollapsableContainer, headerState } from "./CollapsableContainer";

function storageMock() {
  let storage = {};

  return {
    setItem(key: string, value: any) {
      storage[key] = value || "";
    },
    getItem(key: string) {
      return key in storage ? storage[key] : null;
    },
    removeItem(key: string) {
      delete storage[key];
    },
    get length() {
      return Object.keys(storage).length;
    },
    key(i: string) {
      let keys = Object.keys(storage);
      return keys[i] || null;
    },
  };
}

(window as any).localStorage = storageMock();

describe("<CollapsableContainer />", () => {
  it("Renders the default collapsable container", () => {
    const container = enzyme.shallow(
      <CollapsableContainer>CONTENT</CollapsableContainer>
    );

    expect(container).toMatchSnapshot();
    expect(container.find(".content")).toHaveLength(1);

    // Toggle
    container.find("h3").simulate("click");
    expect(container).toMatchSnapshot();
    expect(container.find(".content")).toHaveLength(0);
  });

  it("Renders a collapsable container with settings", () => {
    const container = enzyme.shallow(
      <CollapsableContainer defaultCollapsed={true} title="container">
        CONTENT
      </CollapsableContainer>
    );

    expect(container).toMatchSnapshot();
    expect(container.find(".content")).toHaveLength(0);

    // Toggle
    container.find("h3").simulate("click");
    expect(container).toMatchSnapshot();
    expect(container.find(".content")).toHaveLength(1);
  });

  it("Loads the state from localstorage", () => {
    (window as any).localStorage.setItem("container", "true");
    const container = enzyme.shallow(
      <CollapsableContainer storeCollapsed={true} title="container">
        CONTENT
      </CollapsableContainer>
    );

    expect(container.find(".content")).toHaveLength(0);

    // Toggle
    container.find("h3").simulate("click");
    expect(container.find(".content")).toHaveLength(1);
    expect((window as any).localStorage.getItem("container")).toBe("false");
  });

  it("Gets the error style", () => {
    const container = enzyme.mount(
      <CollapsableContainer error={true} title="container">
        CONTENT
      </CollapsableContainer>
    );

    expect(container.find("div").first().prop("className")).toBe(
      "collapsable container error"
    );
    container.unmount();
  });

  it("Gets the correct classes for each headerstate", () => {
    const containersWithHover = [
      <CollapsableContainer
        key="1"
        header={headerState.SHOWN_ON_HOVER}
        title="container"
      >
        CONTENT
      </CollapsableContainer>,
      <CollapsableContainer
        key="2"
        header={headerState.SHOWN_ON_HOVER}
        defaultCollapsed={true}
        title="container"
      >
        CONTENT
      </CollapsableContainer>,
      <CollapsableContainer
        key="3"
        header={headerState.SHOWN_COLLAPSED}
        title="container"
      >
        CONTENT
      </CollapsableContainer>,
    ];

    const containersWithoutHover = [
      <CollapsableContainer key="4" title="container">
        CONTENT
      </CollapsableContainer>,
      <CollapsableContainer
        key="5"
        header={headerState.SHOWN}
        title="container"
      >
        CONTENT
      </CollapsableContainer>,
      <CollapsableContainer
        key="6"
        header={headerState.SHOWN}
        defaultCollapsed={true}
        title="container"
      >
        CONTENT
      </CollapsableContainer>,
      <CollapsableContainer
        key="7"
        header={headerState.SHOWN_COLLAPSED}
        defaultCollapsed={true}
        title="container"
      >
        CONTENT
      </CollapsableContainer>,
    ];

    containersWithHover.forEach((component) => {
      const container = enzyme.shallow(component);
      expect(container.find("h3").prop("className")).toBe(
        "collapsed-header hover"
      );
    });

    containersWithoutHover.forEach((component) => {
      const container = enzyme.shallow(component);
      expect(container.find("h3").prop("className")).toBe("collapsed-header");
    });
  });
});
